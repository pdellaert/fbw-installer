export default {
    app: {
        getUserDataPath: 'app/getUserDataPath',
    },
    window: {
        minimize: 'window/minimize',
        maximize: 'window/maximize',
        close: 'window/close',
        isMaximized: 'window/isMaximized',
    },
    update: {
        error: 'update/error',
        available: 'update/available',
        downloaded: 'update/downloaded',
    },
    checkForInstallerUpdate: 'checkForInstallerUpdate',
    installManager: {
        fragmenterEvent: 'installManager/fragmenterEvent',
        installFromUrl: 'installManager/installFromUrl',
        cancelInstall: 'installManager/cancelInstall',
        uninstall: 'installManager/uninstall',
    },
    plugins: {
        promptInstallFromUrl: 'plugins/promptInstallFromUrl',
        installFromUrl: 'plugins/installFromUrl',
        deletePlugin: 'plugins/deletePlugin',
        checkForUpdates: 'plugins/checkForUpdates',
        getPluginsToLoad: 'plugins/getPluginsToLoad',
        getPluginFromUrl: 'plugins/getPluginFromUrl',
        getPluginFromPath: 'plugins/getPluginFromPath',
    },
    sentry: {
        requestSessionID: 'sentry/requestSessionID',
        provideSessionID: 'sentry/provideSessionID',
    },
};
