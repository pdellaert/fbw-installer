import React, { FC, useEffect, useState } from 'react';
import { PromptModal } from "renderer/components/Modal/index";
import { ButtonType } from "renderer/components/Button";
import { PluginUtils, PluginUserPreviewInfo } from "common/plugins/PluginUtils";
import { ipcRenderer } from "electron";
import channels from "common/channels";
import { PluginRendererManager } from 'renderer/plugins/PluginRendererManager';
import { PluginPayload } from 'common/plugins/PluginTypes';

export interface PluginInstallModalProps {
    pluginPayLoad: PluginPayload,
    onAcknowledge?: () => void;
    onCancel?: () => void;
}

export const PluginInstallModal: FC<PluginInstallModalProps> = ({ pluginPayLoad, onAcknowledge, onCancel }) => {
    const [previewInfo, setPreviewInfo] = useState<PluginUserPreviewInfo | null>(null);
    const pluginDistributionFile = pluginPayLoad.distFile;

    useEffect(() => {
        PluginUtils.generateUserPreview(pluginPayLoad.assets).then((info) => setPreviewInfo(info));
    }, []);

    const onConfirm = async () => {
        await ipcRenderer.invoke(channels.plugins.installFromUrl, pluginDistributionFile.originUrl);
        ipcRenderer.invoke(channels.plugins.getPluginsToLoad).then((plugins) => {
            for (const plugin of plugins) {
                PluginRendererManager.loadPlugin(plugin);
            }
        });
        if (onAcknowledge) {
            onAcknowledge();
        }
    };

    return (
        <PromptModal
            title={(
                <div className="flex flex-col items-center gap-y-3.5 text-utility-red fill-current mb-2.5">
                    {!pluginPayLoad.verified ? (<h3 className='text-red-600'>This plugin is not trusted and can not be verified!</h3>) : null}
                    <h2 className="modal-title-sm">Do you want to add</h2>
                    {pluginPayLoad.verified ? (<img className="bg-navy-light p-3 rounded-md" width={64} src={pluginDistributionFile.metadata.iconFile} />) : null}
                    <h1 className="modal-title pb-0">{pluginDistributionFile.metadata.name}</h1>
                    <h3 className="modal-title-sm">to your installer?</h3>
                    {!pluginPayLoad.verified ? (<h3 className='text-red-600'>This plugin is not trusted and can not be verified!</h3>) : null}
                </div>
            )}
            bodyText={(
                <div className="flex flex-col gap-y-5">
                    <p>{pluginDistributionFile.metadata.description}</p>

                    {previewInfo?.downloadServers.length > 0 && (
                        <>
                            <p>Includes addons downloaded from the following servers</p>

                            {previewInfo.downloadServers.map((server) => <pre className="overflow-hidden">{server}</pre>)}
                        </>
                    )}
                </div>
            )}
            onConfirm={onConfirm}
            onCancel={onCancel}
            confirmColor={pluginPayLoad.verified ? ButtonType.Positive : ButtonType.Danger}
        />
    );
};
