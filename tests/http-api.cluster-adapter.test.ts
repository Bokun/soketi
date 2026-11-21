import { Server } from './../src/server';
import { Utils } from './utils';

jest.retryTimes(parseInt(process.env.RETRY_TIMES || '1'));

describe('http api test for cluster adapter', () => {
    beforeEach(() => {
        jest.resetModules();

        return Utils.waitForPortsToFreeUp();
    });

    afterEach(() => {
        return Utils.flushServers();
    });

    Utils.shouldRun(Utils.adapterIs('cluster') && Utils.appManagerIs('array'))('broadcast to user for cluster', done => {
        Utils.newServer({ 'appManager.array.apps.0.enableUserAuthentication': true, 'userAuthenticationTimeout': 5_000 }, (server1: Server) => {
            Utils.newClonedServer(server1, { 'port': 6002, 'appManager.array.apps.0.enableUserAuthentication': true, 'userAuthenticationTimeout': 5_000 }, (server2: Server) => {
                let client1 = Utils.newClientForPrivateChannel({}, 6001, 'app-key', { id: 1 });
                let client2;
                let backend = Utils.newBackend();

                client1.connection.bind('connected', () => {
                    client1.connection.bind('message', (message) => {
                        if (message.event === 'pusher:signin_success') {
                            client2 = Utils.newClientForPrivateChannel({}, 6002, 'app-key', { id: 2 });

                            client2.connection.bind('connected', () => {
                                client2.connection.bind('message', (payload) => {
                                    if (payload.event === 'pusher:signin_success') {
                                        backend.sendToUser('1', 'my-event', { works: true });
                                    }
                                });

                                client2.signin();
                            });
                        }

                        if (message.event === 'my-event') {
                            client1.disconnect();
                            client2.disconnect();
                            done();
                        }
                    });

                    client1.signin();
                });
            });
        });
    });
});
