import { ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import { PluginDistributionFile } from "common/plugins/PluginDistributionFile";
import channels from "common/channels";
import { Response } from 'node-fetch';
import { PluginAssetPayload, PluginPayload } from "common/plugins/PluginTypes";
import { parse, compare } from "semver";
import { PluginUtils } from "common/plugins/PluginUtils";

export class PluginInstallManager {
    static setupIpcListeners(): void {
        ipcMain.handle(channels.plugins.installFromUrl, (event, url: string) => this.installPlugin(url));
        ipcMain.handle(channels.plugins.deletePlugin, async (event, id: string) => this.deletePluginById(id));
        ipcMain.handle(channels.plugins.getPluginsToLoad, async () => await this.getPluginsToLoad());
        ipcMain.handle(channels.plugins.checkForUpdates, async () => await this.checkForPluginUpdates());
        ipcMain.handle(channels.plugins.getPluginFromUrl, async (event, distUrl) => await this.getPluginFromUrl(distUrl));
        ipcMain.handle(channels.plugins.getPluginFromPath, async (event, pluginId, version = 'current') => await this.getPluginFromPath(pluginId, version));
    }

    private static async installPlugin(baseUrl: string): Promise<void> {
        const plugin: PluginPayload = await this.getPluginFromUrl(baseUrl);
        const { distFile, assets } = plugin;

        const pluginPath = path.join(PluginUtils.getPluginsRoot(), distFile.metadata.id);
        const pluginVersionPath = path.join(pluginPath, distFile.metadata.version.toString());
        const pluginCurrentLinkPath = path.join(pluginPath, 'current');
        try {
            await fs.ensureDir(PluginUtils.getPluginsRoot());
            await fs.ensureDir(pluginPath);
            await fs.ensureDir(pluginVersionPath);
            await fs.ensureDir(path.join(pluginVersionPath, 'assets'));
        } catch (err) {
            console.log(`[PluginInstallerManager] Failure to create necessary folders: ${err.message}`);
            return;
        }
        try {
            for (const asset of assets) {
                await fs.writeFile(path.join(pluginVersionPath, 'assets', asset.file), asset.buffer);
            }
        } catch (err) {
            console.log(`[PluginInstallerManager] Failure to download or write plugin assets: ${err.message}`);
            return;
        }
        try {
            await fs.writeFile(path.join(pluginPath, 'dist.json'), JSON.stringify(distFile));
        } catch (err) {
            console.log(`[PluginInstallerManager] Failure to write the plugin dist.json: ${err.message}`);
            return;
        }
        // Create link from current to installed version
        try {
            const linkStats = await fs.lstat(pluginCurrentLinkPath);
            if (linkStats.isSymbolicLink()) {
                await fs.unlink(pluginCurrentLinkPath);
            }
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.log(`[PluginInstallManager] Failure to find or unlink ${pluginCurrentLinkPath}: ${err.message}`);
                return;
            }
        }
        try {
            await fs.symlink(pluginVersionPath, pluginCurrentLinkPath, 'junction');
        } catch (err) {
            console.log(`[PluginInstallerManager] Failure to create plugin current symlink: ${err.message}`);
            return;
        }

        console.log(`[PluginInstallManager] Done installing ${distFile.metadata.id}@${distFile.metadata.version}`);
    }

    private static async deletePluginById(id: string): Promise<void> {
        const pluginPath = path.join(PluginUtils.getPluginsRoot(), id);
        try {
            await fs.remove(pluginPath);
        } catch (err) {
            console.log(`[PluginInstallManager] Failed to delete plugin ${id}: ${err}`);
        }

        console.log(`[PluginInstallManager] Done deleting ${id}`);
    }

    private static async getPluginsToLoad(): Promise<PluginPayload[]> {
        const dirents = await fs.readdir(PluginUtils.getPluginsRoot(), { withFileTypes: true });

        const pluginPayloads: PluginPayload[] = [];
        for (const ent of dirents) {
            if (!ent.isDirectory()) {
                continue;
            }

            const pluginPayload = await this.getPluginFromPath(ent.name);
            pluginPayloads.push(pluginPayload);
        }

        return pluginPayloads;
    }

    private static async getMinimalPluginsToLoad(): Promise<Omit<PluginPayload, 'assets'>[]> {
        const dirents = await fs.readdir(PluginUtils.getPluginsRoot(), { withFileTypes: true });

        const pluginPayload: Omit<PluginPayload, 'assets'>[] = [];
        for (const ent of dirents) {
            if (!ent.isDirectory()) {
                continue;
            }

            const pluginDir = path.join(PluginUtils.getPluginsRoot(), ent.name);
            const distBuffer = await fs.readFile(path.join(pluginDir, 'dist.json'));
            const distFile = JSON.parse(distBuffer.toString('utf-8')) as PluginDistributionFile;

            pluginPayload.push({ distFile });
        }

        return pluginPayload;
    }

    private static async checkForPluginUpdates(): Promise<PluginDistributionFile[]> {
        const installedPlugins = await this.getMinimalPluginsToLoad();

        const pluginsToUpdate: PluginDistributionFile[] = [];

        for (const plugin of installedPlugins) {
            let distFileResponse: Response;

            try {
                distFileResponse = await PluginUtils.downloadPluginDistFile(plugin.distFile.originUrl);
            } catch (e) {
                throw new Error(`[PluginInstallManager] Could not download plugin dist file: ${e.message}`);
            }

            const dist = JSON.parse(await distFileResponse.text()) as PluginDistributionFile;

            const versionDiff = compare(parse(dist.metadata.version), parse(plugin.distFile.metadata.version));

            if (versionDiff === 1) {
                pluginsToUpdate.push(dist);
            }
        }

        return pluginsToUpdate;
    }

    private static async getPluginFromUrl(distUrl: string): Promise<PluginPayload> {
        const assets: PluginAssetPayload[] = [];
        let distFileResponse: Response;
        try {
            distFileResponse = await PluginUtils.downloadPluginDistFile(distUrl);
        } catch (e) {
            throw new Error(`[PluginUtils](getPluginFromUrl) Could not download plugin dist file: ${e.message}`);
        }

        const distFile = JSON.parse(await distFileResponse.text()) as PluginDistributionFile;
        try {
            for (const asset of distFile.assets) {
                const assetResponse = await PluginUtils.downloadPluginAsset(distFile, asset);
                assets.push({
                    file: asset.file,
                    type: asset.type,
                    buffer: await assetResponse.buffer(),
                });
            }
        } catch (e) {
            throw new Error(`[PluginUtils](getPluginFromUrl) Could not download plugin asset file: ${e.message}`);
        }
        const plugin: PluginPayload = {
            distFile,
            assets,
            verified: false,
        };
        return await PluginUtils.verifyPlugin(plugin);
    }

    private static async getPluginFromPath(pluginId: string, version = 'current'): Promise<PluginPayload> {
        const pluginDir = path.join(PluginUtils.getPluginsRoot(), pluginId);
        const distBuffer = await fs.readFile(path.join(pluginDir, 'dist.json'));
        const distFile = JSON.parse(distBuffer.toString('utf-8')) as PluginDistributionFile;
        const assets: PluginAssetPayload[] = [];
        for (const asset of distFile.assets) {
            const buffer = await fs.readFile(path.join(pluginDir, version, 'assets', asset.file));
            assets.push({ ...asset, buffer });
        }
        const plugin: PluginPayload = {
            distFile,
            assets,
            verified: false,
        };
        return await PluginUtils.verifyPlugin(plugin);
    }

}
