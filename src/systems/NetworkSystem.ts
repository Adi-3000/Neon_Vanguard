import Peer from 'peerjs';
import type { PlayerRole } from '../entities/Player';

export interface PlayerState {
    id: string;
    role: PlayerRole;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    isDead: boolean;
    isFiring: boolean;
    aimX: number;
    aimY: number;
    score: number;
    healingStation?: { active: boolean, x: number, y: number, radius: number, hp: number, maxHp: number, timer?: number } | null;
    powerUps?: {
        shield: boolean;
        sword: boolean;
        doubleFire: boolean;
        glassCannon: boolean;
    } | null;
}

export interface GameState {
    enemies: { type: string, x: number, y: number, hp: number, id: number }[];
    projectiles: { x: number, y: number, vx: number, vy: number, isEnemy: boolean }[];
    wave: number;
    shards: number;
}

export class NetworkSystem {
    peer: Peer | null = null;
    connections: any[] = [];
    isHost: boolean = false;
    roomId: string = '';

    // Local player info
    myId: string = '';
    myRole: PlayerRole | null = null;

    // Remote state cache
    remotePlayers: Map<string, PlayerState> = new Map();
    playerRoles: Map<string, PlayerRole> = new Map(); // Track each player's selected role

    constructor() { }

    async createRoom(): Promise<string> {
        return new Promise((resolve) => {
            const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
            this.peer = new Peer(shortId);
            this.peer.on('open', (id) => {
                this.roomId = id;
                this.myId = id;
                this.isHost = true;
                resolve(id);
            });

            this.peer.on('error', (err: any) => {
                if (err.type === 'unavailable-id') {
                    // Try again with a different ID if taken
                    this.createRoom().then(resolve);
                }
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });
        });
    }

    async joinRoom(id: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.peer = new Peer();
            this.peer.on('open', (myId) => {
                this.myId = myId;
                this.roomId = id;
                this.isHost = false;
                const conn = this.peer!.connect(id);
                this.handleConnection(conn);
                resolve(true);
            });

            this.peer.on('error', () => resolve(false));
        });
    }

    private handleConnection(conn: any) {
        console.log('[NETWORK] handleConnection called for peer:', conn.peer);

        conn.on('open', () => {
            console.log('[NETWORK] Connection opened with peer:', conn.peer);
            if (!this.connections.find(c => c.peer === conn.peer)) {
                this.connections.push(conn);
                console.log('[NETWORK] Added to connections. Total connections:', this.connections.length);
                if (this.isHost) {
                    // Send existing roles to the new player
                    this.playerRoles.forEach((role, id) => {
                        conn.send({ type: 'ROLE_PICKED', payload: { id, role } });
                    });
                }
                window.dispatchEvent(new CustomEvent('networkConnectionChanged'));
            }
        });

        conn.on('data', (data: any) => {
            console.log('[NETWORK] Received data from', conn.peer, ':', data);
            this.processPacket(conn.peer, data);
        });

        conn.on('close', () => {
            console.log('[NETWORK] Connection closed with peer:', conn.peer);
            this.connections = this.connections.filter(c => c.peer !== conn.peer);
            this.remotePlayers.delete(conn.peer);
            this.playerRoles.delete(conn.peer);
            window.dispatchEvent(new CustomEvent('networkConnectionChanged'));
        });

        conn.on('error', (err: any) => {
            console.error('[NETWORK] Connection error with peer:', conn.peer, err);
        });
    }

    private processPacket(peerId: string, data: any) {
        if (data.type === 'PLAYER_SYNC') {
            this.remotePlayers.set(peerId, data.payload);
            // If host, rebroadcast to others
            if (this.isHost) {
                this.broadcast('PLAYER_SYNC', data.payload, [peerId]);
            }
        }

        if (data.type === 'ROLE_PICKED') {
            // Store the role for this player
            this.playerRoles.set(data.payload.id, data.payload.role);
            window.dispatchEvent(new CustomEvent('networkRolePicked', { detail: data.payload }));
            if (this.isHost) {
                // Rebroadcast to all other clients
                this.broadcast('ROLE_PICKED', data.payload, [peerId]);
            }
        }

        if (data.type === 'START_MISSION' && !this.isHost) {
            console.log('[NETWORK] Received START_MISSION:', data.payload);
            window.dispatchEvent(new CustomEvent('networkStartMission', { detail: data.payload }));
        }

        if (data.type === 'WORLD_SYNC' && !this.isHost) {
            window.dispatchEvent(new CustomEvent('networkWorldSync', { detail: data.payload }));
        }

        if (data.type === 'FIRE_BULLET') {
            // payload: { x, y, tx, ty, damageMult }
            window.dispatchEvent(new CustomEvent('networkFireBullet', { detail: data.payload }));
            // If host, rebroadcast to others (excluding sender if possible, but simplest is broadcast all and let client filter)
            // Actually, if client sends to host, host broadcasts to others.
            if (this.isHost) {
                this.broadcast('FIRE_BULLET', data.payload, [peerId]);
            }
        }

        if (data.type === 'REVIVE_PLAYER') {
            window.dispatchEvent(new CustomEvent('networkRevivePlayer', { detail: data.payload }));
            if (this.isHost) {
                this.broadcast('REVIVE_PLAYER', data.payload, [peerId]);
            }
        }

        if (data.type === 'ABILITY_ACTIVATED') {
            window.dispatchEvent(new CustomEvent('networkAbilityActivated', { detail: { ...data.payload, peerId } }));
            if (this.isHost) {
                this.broadcast('ABILITY_ACTIVATED', data.payload, [peerId]);
            }
        }

        if (data.type === 'MISSION_FAILED') {
            window.dispatchEvent(new CustomEvent('networkMissionFailed', { detail: data.payload }));
        }

        if (data.type === 'RESTART_MISSION') {
            window.dispatchEvent(new CustomEvent('networkRestartMission', { detail: data.payload }));
        }

        if (data.type === 'POWERUP_PAUSE') {
            window.dispatchEvent(new CustomEvent('networkPowerUpPause', { detail: data.payload }));
        }

        if (data.type === 'TRIGGER_POWERUP') {
            window.dispatchEvent(new CustomEvent('networkTriggerPowerup', { detail: data.payload }));
        }
    }

    broadcast(type: string, payload: any, exclude: string[] = []) {
        this.connections.forEach(conn => {
            if (!exclude.includes(conn.peer)) {
                conn.send({ type, payload });
            }
        });
    }

    sendToHost(type: string, payload: any) {
        const hostConn = this.connections.find(c => c.peer === this.roomId);
        if (hostConn) {
            hostConn.send({ type, payload });
        }
    }
}
