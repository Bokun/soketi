import axios from 'axios';
import { Server } from './../src/server';
import { Utils } from './utils';

jest.retryTimes(parseInt(process.env.RETRY_TIMES || '1'));

describe('http api test', () => {
    beforeEach(() => {
        jest.resetModules();

        return Utils.waitForPortsToFreeUp();
    });

    afterEach(() => {
        return Utils.flushServers();
    });

    test('health checks', done => {
        Utils.newServer({}, (server: Server) => {
            axios.get('http://127.0.0.1:6001').then(res => {
                done();
            }).catch(() => {
                throw new Error('Healthchecks failed');
            });
        });
    });

    test('usage endpoint', done => {
        Utils.newServer({}, (server: Server) => {
            axios.get('http://127.0.0.1:9601/usage').then(res => {
                done();
            }).catch(() => {
                throw new Error('Usage endpoint failed');
            });
        });
    });

    test('passing an inexistent app id will return 404', done => {
        Utils.newServer({}, (server: Server) => {
            let backend = Utils.newBackend('inexistent-app-id');

            backend.trigger('ch1', 'greeting', { message: 'hello' }).then(() => {
                throw new Error('The request must be refused.');
            }, err => {
                expect(err.status).toBe(404);
                expect(JSON.parse(err.body).code).toBe(404);
                done();
            });
        });
    });

    test('a wrong secret returns 401', done => {
        Utils.newServer({}, (server: Server) => {
            let backend = Utils.newBackend('app-id', 'app-key', 'invalidSecret');

            backend.trigger('ch1', 'greeting', { message: 'hello' }).then(() => {
                throw new Error('The request must be refused.');
            }, err => {
                expect(err.status).toBe(401);
                expect(JSON.parse(err.body).code).toBe(401);
                done();
            });
        });
    });

    test('a successful trigger returns 200 with the CORS headers', done => {
        Utils.newServer({}, (server: Server) => {
            let backend = Utils.newBackend();

            backend.trigger('ch1', 'greeting', { message: 'hello' }).then(res => {
                expect(res.status).toBe(200);
                expect(res.headers.get('access-control-allow-origin')).toBe('*');
                done();
            });
        });
    });

    test('the endpoints the Bokun fork removed return 404', done => {
        Utils.newServer({}, (server: Server) => {
            let backend = Utils.newBackend();

            Promise.allSettled([
                backend.get({ path: '/channels' }),
                backend.get({ path: '/channels/ch1' }),
                backend.get({ path: '/channels/presence-ch1/users' }),
                backend.triggerBatch([{ name: 'greeting', channel: 'ch1', data: { message: 'hello' } }]),
                backend.terminateUserConnections('1'),
                axios.get('http://127.0.0.1:6001/accept-traffic'),
            ]).then(results => {
                results.forEach(result => {
                    expect(result.status).toBe('rejected');

                    let reason = (result as PromiseRejectedResult).reason;

                    expect(reason.status || reason.response.status).toBe(404);
                });

                done();
            });
        });
    });

    test('throw error when credentials dont match', done => {
        Utils.newServer({}, (server: Server) => {
            let client = Utils.newClient();
            let channelName = Utils.randomChannelName();
            let goodBackend = Utils.newBackend();
            let badBackend = Utils.newBackend('app-id', 'app-key', 'invalidSecret');

            client.connection.bind('connected', () => {
                let channel = client.subscribe(channelName);

                channel.bind('greeting-from-bad', e => {
                    // throw the test if the bad backend can emit
                    // meaning that the security does not work
                    expect(true).toBeFalsy();
                    done();
                });

                channel.bind('greeting-from-good', e => {
                    client.disconnect();
                    done();
                });

                channel.bind('pusher:subscription_succeeded', () => {
                    badBackend.trigger(channelName, 'greeting-from-bad', {
                        message: 'hello',
                        array: ['we', 'support', 'array'],
                        objects: { works: true },
                    }).then(() => {
                        throw new Error('The bad backend must be refused.');
                    }, err => {
                        expect(err.status).toBe(401);
                    });

                    goodBackend.trigger(channelName, 'greeting-from-good', {
                        message: 'hello',
                        array: ['we', 'support', 'array'],
                        objects: { works: true },
                    }).catch(error => {
                        throw new Error(error);
                    });
                });
            });
        });
    });

    test('should check for eventLimits.maxChannelsAtOnce', done => {
        Utils.newServer({ 'eventLimits.maxChannelsAtOnce': 1 }, (server: Server) => {
            let backend = Utils.newBackend();

            backend.trigger(['ch1', 'ch2'], 'greeting', { message: 'hello' })
                .then(() => {
                    throw new Error('The request must be refused.');
                }, err => {
                    expect(err.status).toBe(400);
                    expect(JSON.parse(err.body).code).toBe(400);
                    done();
                });
        });
    });

    test('should check for eventLimits.maxNameLength', done => {
        Utils.newServer({ 'eventLimits.maxNameLength': 7 }, (server: Server) => {
            let backend = Utils.newBackend();

            backend.trigger('ch1', 'greeting', { message: 'hello' })
                .then(() => {
                    throw new Error('The request must be refused.');
                }, err => {
                    expect(err.status).toBe(400);
                    expect(JSON.parse(err.body).code).toBe(400);
                    done();
                });
        });
    });

    test('should check for eventLimits.maxPayloadInKb', done => {
        Utils.newServer({ 'eventLimits.maxPayloadInKb': 1/1024 }, (server: Server) => {
            let backend = Utils.newBackend();

            backend.trigger('ch1', 'greeting', { message: 'hello' })
                .then(() => {
                    throw new Error('The request must be refused.');
                }, err => {
                    expect(err.status).toBe(413);
                    expect(JSON.parse(err.body).code).toBe(413);
                    done();
                });
        });
    });

    test('should check for httpApi.requestLimitInMb', done => {
        Utils.newServer({ 'httpApi.requestLimitInMb': 1/1024/1024 }, (server: Server) => {
            let backend = Utils.newBackend();

            backend.trigger('ch1', 'greeting', { message: 'hello' })
                .catch(err => {
                    expect(err.body).toBeDefined();
                    expect(err.status).toBe(413);
                    done();
                })
                .then(res => {
                    if (res && res.json()) {
                        throw new Error('The request limit did not work.');
                    }
                });
        });
    });

    test('non existent route must return 404', done => {
        Utils.newServer({}, (server: Server) => {
            axios.get('http://127.0.0.1:6001/favicon.ico').then(res => {
                throw new Error('Status must be 404');
            },(e) => {
                if (e.response.status !== 404) {
                    throw new Error('Status must be 404');
                }

                done();
            });
        });
    });

    test('check server can handle a numeric app id', done => {
        Utils.newServer({
            'appManager.array.apps.0.id': 40000
        }, (server: Server) => {
            // Don't test database configs, because the APP-ID is hard coded (therefore this will always fail).
            if (process.env.TEST_APP_MANAGER != 'array') {
                done();
            }

            let client = Utils.newClient();
            let backend = Utils.newBackend("40000");
            let channelName = Utils.randomChannelName();

            client.connection.bind('connected', () => {
                let channel = client.subscribe(channelName);

                channel.bind('greeting', e => {
                    expect(e.message).toBe('hello');
                    expect(e.weirdVariable).toBe('abc/d');
                    client.disconnect();
                    done();
                });

                channel.bind('pusher:subscription_succeeded', () => {
                    backend.trigger(channelName, 'greeting', { message: 'hello', weirdVariable: 'abc/d' })
                        .catch(error => {
                            throw new Error(error);
                        });
                });
            });
        });
    });

    Utils.shouldRun(Utils.appManagerIs('array'))('broadcast to user', done => {
        Utils.newServer({ 'appManager.array.apps.0.enableUserAuthentication': true, 'userAuthenticationTimeout': 5_000 }, (server: Server) => {
            let client = Utils.newClientForPrivateChannel({}, 6001, 'app-key', { id: 1 });
            let backend = Utils.newBackend();

            client.connection.bind('connected', () => {
                client.connection.bind('message', (message) => {
                    if (message.event === 'my-event') {
                        client.disconnect();
                        done();
                    }

                    if (message.event === 'pusher:signin_success') {
                        backend.sendToUser('1', 'my-event', { works: true });
                    }
                });

                client.signin();
            });
        });
    });
});
