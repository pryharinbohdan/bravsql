import * as base from './base.js';

class RemoteSettingsApp {
    settings : base.CfSettings;

    constructor() {
        this.settings = new base.CfSettings();
        this.settings.updateApiCaption(this.settings.cf_api_key_sett!.getStorageValue());
        this.settings.setupCloudflareEventListeners();
    }
}

const remote_settings_app = new RemoteSettingsApp();