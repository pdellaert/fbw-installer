import React, { FC, useEffect, useState } from 'react';
import { PromptModal, useModals } from '../Modal';
import { PluginInstallModal } from '../Modal/PluginInstallModal';
import { ipcRenderer } from 'electron';
import channels from 'common/channels';
import { PluginPayload } from 'common/plugins/PluginTypes';
import { ButtonType } from '../Button';
import { PluginRendererManager } from 'renderer/plugins/PluginRendererManager';

const SettingsItem: FC<{ name: string }> = ({ name, children }) => (
    <div className="flex flex-row items-center justify-between py-3.5">
        <p className="m-0 w-1/6">{name}</p>
        {children}
    </div>
);

const index = (): JSX.Element => {
    const [addPluginURL, setAddPluginURL] = useState<string>('');
    const [addPluginUrlValid, setAddPluginUrlValid] = useState<boolean>(true);
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [pluginList, setPluginList] = useState([]);
    const { showModal } = useModals();

    const PluginItem: FC<{plugin: PluginPayload, isDeleting: boolean, isReloading: boolean}> = ({ plugin, isDeleting, isReloading }) => (
        <div className="flex flex-row items-center justify-between py-3.5">
            <p className="m-2 w-1/4">{plugin.distFile.metadata.name}</p>
            <p className="m-2 w-1/4">{plugin.distFile.metadata.version}</p>
            <p className="m-2 w-1/4">{plugin.verified !== undefined && plugin.verified ? '✅' : '❌' }</p>
            <p className="m-2 w-1/4 flex justify-end">
                <button className="button button-neutral p-3 mr-5 flex flex-row justify-center items-center text-2xl" onClick={() => reloadPlugin(plugin)} disabled={isReloading}>
                    { isReloading ? (
                        <svg className="animate-spin mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : null }
                    Reload
                </button>
                <button className="button button-neutral p-3 flex flex-row justify-center items-center text-2xl" onClick={() => deletePlugin(plugin)} disabled={isDeleting}>
                    { isDeleting ? (
                        <svg className="animate-spin ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : null }
                    Delete
                </button>
            </p>
        </div>
    );

    async function getPlugins() {
        const plugins = await ipcRenderer.invoke(channels.plugins.getPluginsToLoad);
        const newPluginList = [];
        for (const plugin of plugins) {
            newPluginList.push({ plugin: plugin, isReloading: false, isDeleting: false });
        }
        setPluginList(newPluginList);
    }

    const showAddPluginModal = async () => {
        setIsAdding(true);
        if (addPluginURL.trim().length === 0) {
            setAddPluginUrlValid(false);
            setIsAdding(false);
        }
        if (addPluginUrlValid) {
            fetch(`${addPluginURL}/dist.json`)
                .then((response) => {
                    setAddPluginUrlValid(response.status === 200);
                    setIsAdding(response.status === 200);
                }).catch(() => {
                    setAddPluginUrlValid(false);
                    setIsAdding(false);
                });
        }
        if (addPluginUrlValid) {
            const plugin = await ipcRenderer.invoke(channels.plugins.getPluginFromUrl, addPluginURL);
            showModal(<PluginInstallModal
                pluginPayLoad={plugin}
                onAcknowledge={() => {
                    getPlugins();
                    setIsAdding(false);
                }}
                onCancel={() => setIsAdding(false)}
            />);
        }
    };

    const reloadPlugin = async (plugin: PluginPayload) => {
        const newPluginList = pluginList.map((pluginItem) => {
            if (pluginItem.plugin.distFile.metadata.id === plugin.distFile.metadata.id) {
                pluginItem.isReloading = true;
            }
            return pluginItem;
        });
        setPluginList(newPluginList);
        await ipcRenderer.invoke(channels.plugins.installFromUrl, plugin.distFile.originUrl);
        PluginRendererManager.unLoadPlugin(plugin);
        ipcRenderer.invoke(channels.plugins.getPluginsToLoad).then((plugins) => {
            for (const plugin of plugins) {
                PluginRendererManager.loadPlugin(plugin);
            }
        });
        getPlugins();
    };

    const deletePlugin = (plugin: PluginPayload) => {
        const newPluginList = pluginList.map((pluginItem) => {
            if (pluginItem.plugin.distFile.metadata.id === plugin.distFile.metadata.id) {
                pluginItem.isDeleting = true;
            }
            return pluginItem;
        });
        setPluginList(newPluginList);
        showModal(<PromptModal
            title={`Delete ${plugin.distFile.metadata.name} plugin?`}
            bodyText='This will remove the plugin from your installer.'
            confirmColor={ButtonType.Danger}
            onCancel={async () =>{
                getPlugins();
            }}
            onConfirm={async () => {
                await ipcRenderer.invoke(channels.plugins.deletePlugin, plugin.distFile.metadata.id);
                PluginRendererManager.unLoadPlugin(plugin);
                getPlugins();
            }}
        />);
    };

    useEffect(() => {
        getPlugins();
    }, []);

    return (
        <div>
            <div className="space-y-4 mt-4">
                <h2 className="text-white">Plugin Management</h2>
                <div className="divide-y divide-gray-600">
                    <SettingsItem name="Add a Plugin">
                        <div className="flex flex-row items-center text-white w-full">
                            <input
                                value={addPluginURL}
                                onChange={async event => await setAddPluginURL(event.target.value)}
                                className={`p-2 w-full ${addPluginUrlValid ? null : 'text-red-500'}`}
                                disabled={isAdding}
                                onFocus={() => setAddPluginUrlValid(true)}
                            />
                            <button className="button button-neutral p-3 ml-5 flex flex-row justify-center items-center text-2xl" onClick={showAddPluginModal} disabled={isAdding}>
                                { isAdding ? (
                                    <svg className="animate-spin mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : null }
                                Add
                            </button>
                        </div>
                    </SettingsItem>
                </div>
                <div>
                    <h4 className="text-white">Installed Plugins</h4>
                    <div className="flex flex-row items-center justify-between py-3.5">
                        <p className="m-0 w-1/4">Name</p>
                        <p className="m-0 w-1/4">Version</p>
                        <p className="m-0 w-1/4">Verified</p>
                        <p className="m-0 text-right w-1/4">Actions</p>
                    </div>
                    {pluginList.map((pluginItem) => (
                        <PluginItem plugin={pluginItem.plugin} isDeleting={pluginItem.isDeleting} isReloading={pluginItem.isReloading} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default index;
