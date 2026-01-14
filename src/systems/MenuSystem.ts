import type { PlayerRole } from '../entities/Player';

export class MenuSystem {
    game: any;
    uiContainer: HTMLElement;

    constructor(game: any) {
        console.log('[MENU] Constructor called');
        this.game = game;
        this.uiContainer = document.getElementById('ui-layer')!;
        console.log('[MENU] UI Container:', this.uiContainer);

        window.addEventListener('networkRolePicked', () => {
            if (document.getElementById('lobby-id')) {
                this.updateLobbyUI();
            }
        });

        window.addEventListener('networkConnectionChanged', () => {
            if (document.getElementById('lobby-id')) {
                this.updateLobbyUI();
            }
        });
    }

    showMainMenu() {
        console.log('[MENU] showMainMenu() called');
        const isSmall = window.innerWidth < 600;
        console.log('[MENU] Screen size - isSmall:', isSmall, 'width:', window.innerWidth);
        this.uiContainer.innerHTML = `
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                text-align: center;
                color: #fff;
                font-family: monospace;
                pointer-events: auto;
                width: 90%;
                background: rgba(0,0,5,0.8);
                padding: 2rem;
                border: 2px solid #0ff;
            ">
                <h1 style="
                    font-size: ${isSmall ? '2.5rem' : '4.5rem'}; 
                    color: #0ff; 
                    text-shadow: 0 0 20px #0ff;
                    margin-bottom: 2rem;
                    letter-spacing: 5px;
                ">NEON VANGUARD</h1>
                
                <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
                    <button id="btn-start" style="
                        background: transparent;
                        border: 2px solid #0ff;
                        color: #0ff;
                        padding: 1rem 3rem;
                        font-size: 1.5rem;
                        font-family: monospace;
                        cursor: pointer;
                        transition: 0.3s;
                        width: 250px;
                        text-shadow: 0 0 10px #0ff;
                        box-shadow: 0 0 10px rgba(0,255,255,0.3);
                    " onmouseover="this.style.background='rgba(0,255,255,0.1)'; this.style.transform='scale(1.05)'"
                      onmouseout="this.style.background='transparent'; this.style.transform='scale(1)'">
                        START GAME
                    </button>

                    <button id="btn-scores" style="
                        background: transparent;
                        border: 2px solid #ff0;
                        color: #ff0;
                        padding: 1rem 3rem;
                        font-size: 1.2rem;
                        font-family: monospace;
                        cursor: pointer;
                        transition: 0.3s;
                        width: 250px;
                    " onmouseover="this.style.background='rgba(255,255,0,0.1)'; this.style.transform='scale(1.05)'"
                      onmouseout="this.style.background='transparent'; this.style.transform='scale(1)'">
                        HIGH SCORES
                    </button>

                    <button id="btn-multiplayer" style="
                        background: transparent;
                        border: 2px solid #f0f;
                        color: #f0f;
                        padding: 1rem 3rem;
                        font-size: 1.2rem;
                        font-family: monospace;
                        cursor: pointer;
                        transition: 0.3s;
                        width: 250px;
                        text-shadow: 0 0 10px #f0f;
                    " onmouseover="this.style.background='rgba(255,0,255,0.1)'; this.style.transform='scale(1.05)'"
                      onmouseout="this.style.background='transparent'; this.style.transform='scale(1)'">
                        MULTIPLAYER
                    </button>
                </div>

                <div style="margin-top: 3rem; color: #555; font-size: 0.8rem;">
                    v1.2 Mobile Refined
                </div>
            </div>
        `;

        document.getElementById('btn-start')!.onclick = () => this.showCharacterSelect();
        document.getElementById('btn-scores')!.onclick = () => this.showHighScores();
        document.getElementById('btn-multiplayer')!.onclick = () => this.showMultiplayerMenu();
    }

    showMultiplayerMenu() {
        // Clear any old multiplayer state
        this.game.networkSystem.playerRoles.clear();
        this.game.networkSystem.myRole = null;
        this.game.networkSystem.connections = []; // Reset connections just in case

        this.uiContainer.innerHTML = `
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                text-align: center;
                color: #fff;
                font-family: monospace;
                pointer-events: auto;
                width: 90%;
                background: rgba(0,0,5,0.9);
                padding: 2rem;
                border: 2px solid #f0f;
            ">
                <h1 style="color: #f0f; margin-bottom: 2rem;">MULTIPLAYER</h1>
                <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
                    <button id="btn-create" style="background: transparent; border: 2px solid #0ff; color: #0ff; padding: 1rem 2rem; width: 250px; cursor: pointer;">CREATE ROOM</button>
                    <button id="btn-join" style="background: transparent; border: 2px solid #0ff; color: #0ff; padding: 1rem 2rem; width: 250px; cursor: pointer;">JOIN ROOM</button>
                    <button id="btn-multi-back" style="background: transparent; border: 1px solid #555; color: #888; padding: 0.5rem 2rem; width: 250px; cursor: pointer;">BACK</button>
                </div>
            </div>
        `;

        const createBtn = document.getElementById('btn-create') as HTMLButtonElement;
        if (createBtn) {
            createBtn.onclick = async () => {
                createBtn.innerText = 'CREATING...';
                createBtn.disabled = true;
                try {
                    const roomId = await this.game.networkSystem.createRoom();
                    this.showLobby(true, roomId);
                } catch (err) {
                    console.error('[MENU] Failed to create room:', err);
                    alert("Failed to create room. Please check your internet connection and try again.");
                    createBtn.innerText = 'CREATE ROOM';
                    createBtn.disabled = false;
                }
            };
        }

        document.getElementById('btn-join')!.onclick = () => {
            this.showJoinScreen();
        };

        document.getElementById('btn-multi-back')!.onclick = () => this.showMainMenu();
    }

    showJoinScreen() {
        this.uiContainer.innerHTML = `
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                text-align: center;
                color: #fff;
                font-family: monospace;
                pointer-events: auto;
                width: 90%;
                background: rgba(0,0,5,0.95);
                padding: 2.5rem;
                border: 2px solid #0ff;
                box-shadow: 0 0 30px rgba(0,255,255,0.2);
            ">
                <h2 style="color: #0ff; margin-bottom: 2rem; letter-spacing: 2px;">JOIN MISSION</h2>
                <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
                    <input type="text" id="join-room-id" placeholder="ENTER ROOM ID" style="
                        background: rgba(0,0,0,0.5);
                        border: 1px solid #0ff;
                        color: #0ff;
                        padding: 1rem;
                        font-family: monospace;
                        font-size: 1.2rem;
                        width: 100%;
                        max-width: 300px;
                        text-align: center;
                    ">
                    <button id="btn-confirm-join" style="
                        background: #0ff; 
                        color: #000; 
                        border: none; 
                        padding: 1rem 2rem; 
                        width: 100%; 
                        max-width: 300px; 
                        font-weight: bold; 
                        cursor: pointer;
                        font-size: 1rem;
                    ">CONNECT TO HOST</button>
                    <button id="btn-join-back" style="
                        background: transparent; 
                        border: 1px solid #555; 
                        color: #888; 
                        padding: 0.8rem 2rem; 
                        width: 100%; 
                        max-width: 300px; 
                        cursor: pointer;
                    ">BACK</button>
                </div>
            </div>
        `;

        document.getElementById('btn-confirm-join')!.onclick = () => {
            const input = document.getElementById('join-room-id') as HTMLInputElement;
            const roomId = input.value.trim();
            if (roomId) {
                this.game.networkSystem.joinRoom(roomId).then((success: boolean) => {
                    if (success) this.showLobby(false, roomId);
                    else alert("Failed to join room. Verify the ID.");
                });
            } else {
                alert("Please enter a valid Room ID.");
            }
        };

        document.getElementById('btn-join-back')!.onclick = () => this.showMultiplayerMenu();
    }

    showLobby(isHost: boolean, roomId: string) {
        this.renderLobbyBase(isHost, roomId);
        this.updateLobbyUI();
    }

    renderLobbyBase(isHost: boolean, roomId: string) {
        this.uiContainer.innerHTML = `
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                text-align: center;
                color: #fff;
                font-family: monospace;
                pointer-events: auto;
                width: 90%;
            ">
                <h2 style="color: #f0f;">LOBBY: <span id="lobby-id" style="user-select: all;">${roomId}</span></h2>
                <button id="btn-copy" style="
                    margin-left: 10px;
                    background: transparent;
                    border: 1px solid #0ff;
                    color: #0ff;
                    cursor: pointer;
                    padding: 2px 8px;
                    font-size: 0.8rem;
                ">COPY</button>
                <p style="color: #888;">Share this ID with up to 2 other players</p>
                
                <div id="lobby-members" style="margin: 2rem 0; display: flex; justify-content: center; gap: 1rem;">
                    <!-- Members will be listed here -->
                </div>

                <div id="class-cards" style="display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 1rem; flex-wrap: wrap;">
                    <!-- Class cards will be here -->
                </div>

                <div style="margin-top: 2rem;">
                    ${isHost ? '<button id="btn-start-multi" disabled style="background: #0ff; color: #000; border: none; padding: 1rem 3rem; font-weight: bold; cursor: not-allowed; opacity: 0.4;">WAITING FOR ALL PLAYERS...</button>' : '<p style="color: #0ff;">Waiting for host to start...</p>'}
                </div>
            </div>
        `;

        const copyBtn = document.getElementById('btn-copy');
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(roomId).then(() => {
                    copyBtn.innerText = 'COPIED!';
                    // Styles...
                    setTimeout(() => { copyBtn.innerText = 'COPY'; }, 2000);
                });
            };
        }

        if (isHost) {
            document.getElementById('btn-start-multi')!.onclick = () => {
                // Final validation: check if everyone actually has a role
                const allPlayers = this.game.networkSystem.connections.length + 1;
                const playersWithRoles = this.game.networkSystem.playerRoles.size;

                if (playersWithRoles < allPlayers) {
                    console.warn('[MENU] Cannot start: not all players have picked roles.');
                    return;
                }

                this.game.networkSystem.connections.forEach((conn: any) => {
                    const clientRole = this.game.networkSystem.playerRoles.get(conn.peer) || 'GUNNER';
                    conn.send({ type: 'START_MISSION', payload: { role: clientRole } });
                });
                const hostRole = this.game.networkSystem.myRole || 'GUNNER';
                this.game.isMultiplayer = true;
                this.game.startGame(hostRole as PlayerRole);
            };
        }
    }

    updateLobbyUI() {
        const container = document.getElementById('class-cards');
        const membersDiv = document.getElementById('lobby-members');
        if (!container || !membersDiv) return;

        const playerCount = this.game.networkSystem.connections.length + 1;
        membersDiv.innerHTML = `
            <div style="background: rgba(0,255,255,0.1); border: 1px solid #0ff; padding: 0.5rem 1rem; color: #0ff;">
                PLAYERS IN ROOM: ${playerCount} / 3
            </div>
        `;

        container.innerHTML = `
            ${this.createClassCard('GUNNER', 'DPS', 'Bullet Time', '#00ffff')}
            ${this.createClassCard('GIANT', 'Tank', 'Slam', '#ff4400')}
            ${this.createClassCard('HEALER', 'Support', 'Medic Station', '#00ffaa')}
        `;

        // Validation for host start button
        const startBtn = document.getElementById('btn-start-multi') as HTMLButtonElement;
        if (startBtn) {
            const allPlayers = this.game.networkSystem.connections.length + 1;
            const playersWithRoles = this.game.networkSystem.playerRoles.size;
            const canStart = allPlayers > 0 && playersWithRoles === allPlayers;

            if (!canStart) {
                startBtn.disabled = true;
                startBtn.style.opacity = '0.4';
                startBtn.style.cursor = 'not-allowed';
                startBtn.innerText = 'WAITING FOR ALL PLAYERS...';
            } else {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.style.cursor = 'pointer';
                startBtn.innerText = 'START MISSION';
            }
        }

        this.attachMultiplayerListeners();
    }

    attachMultiplayerListeners() {
        ['GUNNER', 'GIANT', 'HEALER'].forEach(role => {
            const btn = document.getElementById(`select-${role}`);
            let isTakenByOther = false;
            this.game.networkSystem.playerRoles.forEach((r: string, id: string) => {
                if (r === role && id !== this.game.networkSystem.myId) isTakenByOther = true;
            });

            if (btn && !isTakenByOther) {
                btn.onclick = () => {
                    this.game.networkSystem.myRole = role;
                    this.game.networkSystem.playerRoles.set(this.game.networkSystem.myId, role);
                    this.game.networkSystem.broadcast('ROLE_PICKED', { id: this.game.networkSystem.myId, role });
                    this.updateLobbyUI();
                };
            }
        });
    }

    showHighScores() {
        const highScore = localStorage.getItem('antigravity_highscore') || '0';
        const highWave = localStorage.getItem('antigravity_highwave') || '0';

        this.uiContainer.innerHTML = `
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                text-align: center;
                color: #fff;
                font-family: monospace;
                pointer-events: auto;
                width: 80%;
                max-width: 400px;
                background: rgba(0,0,10,0.9);
                padding: 2rem;
                border: 2px solid #ff0;
            ">
                <h1 style="color: #ff0; margin-bottom: 2rem;">HALL OF FAME</h1>
                
                <div style="text-align: left; margin-bottom: 2rem; font-size: 1.2rem;">
                    <p style="color: #0ff;">BEST SCORE: <span style="color: #fff; float: right;">${highScore}</span></p>
                    <p style="color: #0ff;">MAX WAVES: <span style="color: #fff; float: right;">${highWave}</span></p>
                </div>

                <button id="btn-back" style="
                    background: #fff;
                    color: #000;
                    border: none;
                    padding: 0.5rem 2rem;
                    cursor: pointer;
                    font-weight: bold;
                ">BACK</button>
            </div>
        `;

        document.getElementById('btn-back')!.onclick = () => this.showMainMenu();
    }

    showCharacterSelect() {
        const isSmall = window.innerWidth < 600;
        this.uiContainer.innerHTML = `
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                text-align: center;
                color: #fff;
                font-family: monospace;
                pointer-events: auto;
                width: 90%;
            ">
                <h2 style="margin-bottom: 2rem; font-size: ${isSmall ? '1.2rem' : '1.5rem'}; color: #0ff;">SELECT YOUR PILOT</h2>
                
                <div style="display: flex; flex-direction: ${isSmall ? 'column' : 'row'}; justify-content: center; align-items: center; gap: 1rem;">
                    ${this.createClassCard('GUNNER', 'DPS / Agile', 'Bullet Time', '#00ffff')}
                    ${this.createClassCard('GIANT', 'Tank / Area', 'Slam', '#ff4400')}
                    ${this.createClassCard('HEALER', 'Support / Regen', 'Medic Station', '#00ffaa')}
                </div>

                <div style="margin-top: 2rem; color: #888; font-size: ${isSmall ? '0.7rem' : '0.8rem'}; line-height: 1.5;">
                    ${isSmall ? `
                        <p>Joystick to Move | Drag Right Side to Aim</p>
                        <p>Tap Ability Button | Collect Shards for Arsenal (X)</p>
                    ` : `
                        <p>WASD to Move | Mouse to Aim | SPACE for Ability</p>
                        <p>Collect Shards to Upgrade in the ARSENAL (X)</p>
                    `}
                </div>

                <button id="btn-menu-back" style="margin-top: 2rem; background: transparent; border: 1px solid #555; color: #888; padding: 5px 15px; cursor: pointer;">Back to Menu</button>
            </div>
        `;

        this.attachListeners();
        document.getElementById('btn-menu-back')!.onclick = () => this.showMainMenu();
    }

    createClassCard(role: string, type: string, ability: string, color: string) {
        const isSmall = window.innerWidth < 600;

        let pickedById = null;
        this.game.networkSystem.playerRoles.forEach((r: string, id: string) => {
            if (r === role) pickedById = id;
        });

        const isLocked = pickedById !== null && pickedById !== this.game.networkSystem.myId;
        const isSelected = this.game.networkSystem.myRole === role;

        return `
            <div id="select-${role}" style="
                border: 2px solid ${isLocked ? '#444' : (isSelected ? '#fff' : color)};
                background: ${isSelected ? color + '44' : 'rgba(0,0,0,0.8)'};
                padding: ${isSmall ? '0.8rem' : '1.5rem'};
                cursor: ${isLocked ? 'not-allowed' : 'pointer'};
                transition: transform 0.2s;
                width: ${isSmall ? '45%' : '180px'};
                max-width: 280px;
                opacity: ${isLocked ? '0.4' : '1'};
                position: relative;
                box-shadow: ${isSelected ? '0 0 20px ' + color : 'none'};
            ">
                ${isLocked ? '<div style="position:absolute; top:5px; right:5px; font-size:10px; color:#fff; background:#f00; padding:2px 5px; font-family:sans-serif; font-weight:bold;">TAKEN</div>' : ''}
                <h3 style="color:${isLocked ? '#888' : color}; margin: 0; font-size:${isSmall ? '0.9rem' : '1.2rem'}">${role}</h3>
                <p style="color:#ddd; font-size: 0.7rem; margin: 5px 0;">${type}</p>
                <hr style="border-color:${isLocked ? '#444' : color}; margin: 0.5rem 0;">
                <p style="font-size:0.65rem; margin: 0;"><strong>${ability}</strong></p>
            </div>
        `;
    }

    attachListeners() {
        ['GUNNER', 'GIANT', 'HEALER'].forEach(role => {
            const btn = document.getElementById(`select-${role}`);
            if (btn) {
                btn.onclick = () => {
                    this.game.startGame(role as PlayerRole);
                };
            }
        });
    }

    hideMenu() {
        this.uiContainer.innerHTML = '';
    }
}
