import crypto from "crypto";
import fetch, { Response } from 'node-fetch';
import path from "path";
import { app } from "electron";
import { PluginAsset, PluginAssetType, PluginDistributionFile } from "common/plugins/PluginDistributionFile";
import { ConfigurationExtension } from "renderer/utils/InstallerConfiguration";
import { PluginAssetPayload, PluginPayload } from "./PluginTypes";

const PLUGIN_PUBLIC_KEY = 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFaVpMZTU4aXNNdVBONW1sV0FtazNKbTIxRjh3bApFVWNwVUcwUGh6QVcvOS9TMjNWUGhhVGdiVVdlNElZcVZkNHk3UGFyZDdxUys0QjhvVmFGYldPUVR3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t';
export interface PluginUserPreviewInfo {
    downloadServers: string[],
}

export class PluginUtils {
    static async generateUserPreview(assets: PluginAssetPayload[]): Promise<PluginUserPreviewInfo> {
        const downloadServers = new Set<string>();

        for (const asset of assets) {
            switch (asset.type) {
                case PluginAssetType.ConfigurationExtension: {
                    const configExtension: ConfigurationExtension = JSON.parse(new TextDecoder().decode(asset.buffer)) as ConfigurationExtension;

                    for (const directive of configExtension.directives) {
                        switch (directive.directive) {
                            case "addPublishers": {
                                for (const publisher of directive.publishers) {
                                    for (const addon of publisher.addons) {
                                        for (const track of addon.tracks) {
                                            downloadServers.add(track.url);
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    }

                    break;
                }
            }
        }

        return {
            downloadServers: Array.from(downloadServers),
        };
    }

    static async verifyPlugin(plugin: PluginPayload): Promise<PluginPayload> {
        plugin.verified = false;
        if (plugin.distFile.signature === undefined) {
            return plugin;
        }

        const { distFile } = plugin;
        const { signature } = distFile;
        const signatureBuffer = Buffer.from(signature, 'base64');
        const pluginPublicKeyBase64 = Buffer.from(PLUGIN_PUBLIC_KEY || '', 'base64');
        const pluginPublicKey = crypto.createPublicKey(pluginPublicKeyBase64.toString('utf-8'));
        const pluginVerifier = crypto.createVerify('sha256');
        delete distFile.signature;
        pluginVerifier.update(JSON.stringify({
            distFile,
            assets: plugin.assets.map((asset) => JSON.parse(new TextDecoder().decode(asset.buffer))),
        }));
        pluginVerifier.end();
        const pluginVerified = pluginVerifier.verify(pluginPublicKey, signatureBuffer);
        plugin.distFile.signature = signature;
        if (!pluginVerified) {
            console.log(`[PluginUtils](verifyPlugin) ${plugin.distFile.metadata.id} is invalid and can not be verified`);
            plugin.verified = false;
            return plugin;
        }
        plugin.verified = true;
        console.log(`[PluginUtils](verifyPlugin) ${plugin.distFile.metadata.id} is successfully verified`);
        return plugin;
    }

    static async downloadPluginDistFile(baseUrl: string): Promise<Response> {
        const url = `${baseUrl}/dist.json`;
        return await fetch(url);
    }

    static async downloadPluginAsset(dist: PluginDistributionFile, asset: PluginAsset): Promise<Response> {
        const url = `${dist.originUrl}/assets/${asset.file}`;
        return await fetch(url);
    }

    static getPluginsRoot(): string {
        return path.join(app.getPath('userData'), 'plugins');
    }
}
