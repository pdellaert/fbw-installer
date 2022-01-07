import settings from "common/settings";
import net from "net";

export class MCDUServer {

    static async isRunning(): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = net.connect(settings.get('mainSettings.mcduServerPort'));

            socket.on('connect', () => {
                resolve(true);
                socket.destroy();
            });
            socket.on('error', () => {
                resolve(false);
                socket.destroy();
            });
        });
    }

}
