import { WebSocket as UwsWebSocket } from 'uWebSockets.js';

/**
 * Newer uWebSockets.js typings make WebSocket generic and no longer allow
 * arbitrary properties, which soketi sets directly on the socket (id, app, presence...).
 */
export type WebSocket = UwsWebSocket<any> & { [key: string]: any };
