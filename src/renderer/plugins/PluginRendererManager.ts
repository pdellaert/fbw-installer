import { PluginAssetType } from "common/plugins/PluginDistributionFile";
import { PluginAssetPayload, PluginPayload } from "common/plugins/PluginTypes";
import { ConfigurationExtension } from "renderer/utils/InstallerConfiguration";
import { store } from "renderer/redux/store";
import { addPublisher, removePublisher } from "renderer/redux/features/configuration";

export class PluginRendererManager {
    public static loadPlugin(pluginPayload: PluginPayload): void {
        // TODO verify dist

        console.log(`[PluginSystem] Loading plugin ${pluginPayload.distFile.metadata.id}@${pluginPayload.distFile.metadata.version} with ${pluginPayload.assets.length} asset(s)`);

        for (const asset of pluginPayload.assets) {
            console.log(`[PluginSystem] Processing asset '${asset.file}' (${asset.type})`);

            switch (asset.type) {
                case PluginAssetType.ConfigurationExtension: {
                    this.processConfigurationExtensionAsset(asset, 'loadPlugin', pluginPayload.verified !== undefined ? pluginPayload.verified : false);
                    break;
                }
                default: console.error(`[PluginSystem] Unsupported asset type '${asset.type}' for asset '${asset.file}'`);
            }
        }

        console.log(`[PluginSystem] Done loading plugin ${pluginPayload.distFile.metadata.id}@${pluginPayload.distFile.metadata.version}.`);
    }

    public static unLoadPlugin(pluginPayload: PluginPayload): void {
        for (const asset of pluginPayload.assets) {
            console.log(`[PluginSystem] Unload - Processing asset '${asset.file}' (${asset.type})`);

            switch (asset.type) {
                case PluginAssetType.ConfigurationExtension: {
                    this.processConfigurationExtensionAsset(asset, 'unloadPlugin', pluginPayload.verified !== undefined ? pluginPayload.verified : false);
                    break;
                }
                default: console.error(`[PluginSystem] Unload - Unsupported asset type '${asset.type}' for asset '${asset.file}'`);
            }
        }
        console.log(`[PluginSystem] Done unloading plugin ${pluginPayload.distFile.metadata.id}@${pluginPayload.distFile.metadata.version}.`);
    }

    private static processConfigurationExtensionAsset(assetPayload: PluginAssetPayload, pluginAction: string, pluginVerified: boolean) {
        const configurationExtension = JSON.parse(new TextDecoder().decode(assetPayload.buffer)) as ConfigurationExtension;

        // TODO verify config extension

        console.log(`[PluginSystem](processConfigurationExtensionAsset) Processing ${configurationExtension.directives.length} directive(s)`);

        const configurationState = store.getState().configuration;

        for (let i = 0; i < configurationExtension.directives.length; i++) {
            const directive = configurationExtension.directives[i];

            switch (directive.directive) {
                case "addPublishers": {
                    for (const publisher of directive.publishers) {
                        const existingPublisher = configurationState.publishers.find((it) => it.key === publisher.key);
                        switch (pluginAction) {
                            case "loadPlugin":
                                if (existingPublisher) {
                                    console.warn(`[PluginSystem](processConfigurationExtensionAsset) Publisher '${publisher.key}' of directive #${i} dropped because it was already declared`);
                                    continue;
                                }
                                publisher.verified = pluginVerified;
                                console.log(`[PluginSystem](processConfigurationExtensionAsset) Directive #${i} addPublisher ${publisher.key}`);
                                store.dispatch(addPublisher({ publisher }));
                                break;
                            case "unloadPlugin":
                                store.dispatch(removePublisher({ publisher }));
                                break;
                            default: console.error(`[PluginSystem](processConfigurationExtensionAsset) Unknown plugin action '${pluginAction}'.`);
                        }
                    }

                    break;
                }
                default: console.error(`[PluginSystem](processConfigurationExtensionAsset) Unknown directive type '${directive.directive}' for directive #${i}`);
            }
        }
    }
}
