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

                    <button id="btn-whats-new" style="
                        background: transparent;
                        border: 1px solid #aaa;
                        color: #aaa;
                        padding: 0.5rem 2rem;
                        font-size: 1rem;
                        font-family: monospace;
                        cursor: pointer;
                        transition: 0.3s;
                        width: 250px;
                        margin-top: 10px;
                    " onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                      onmouseout="this.style.background='transparent'">
                        WHAT'S NEW
                    </button>
                </div>

                <div style="margin-top: 3rem; color: #555; font-size: 0.8rem;">
                    v2.5 Refined
                </div>
            </div>
        `;

        document.getElementById('btn-start')!.onclick = () => this.showCharacterSelect();
        document.getElementById('btn-scores')!.onclick = () => this.showHighScores();
        document.getElementById('btn-multiplayer')!.onclick = () => this.showMultiplayerMenu();
        document.getElementById('btn-whats-new')!.onclick = () => this.showPatchNotes();
    }

    showPatchNotes() {
        this.uiContainer.innerHTML = `
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                color: #fff;
                font-family: monospace;
                pointer-events: auto;
                width: 90%;
                max-width: 600px;
                background: rgba(0,0,10,0.95);
                padding: 2rem;
                border: 2px solid #aaa;
                max-height: 80vh;
                overflow-y: auto;
            ">
                <h2 style="color: #fff; text-align: center; margin-bottom: 1.5rem; text-decoration: underline;">PATCH NOTES v2.5</h2>
                
                <div style="text-align: left; line-height: 1.6; font-size: 0.9rem;">
                    <h3 style="color: #0ff;">OPTIMIZATION</h3>
                    <ul style="margin-bottom: 1rem;">
                        <li>Game loop & Networking optimized for 3-Player Co-op.</li>
                    </ul>

                    <h3 style="color: #ff4400;">GAMEPLAY BALANCING</h3>
                    <ul style="margin-bottom: 1rem;">
                        <li><strong>GIANT:</strong> Rage Mode (splash damage to nearby enemy,Invincibility, 2x Speed, 2x Fire Rate, and 2x Damage.) cooldown 20s -> 25s.</li>
                        <li><strong>HEALER:</strong> Base HP 120 -> 150. Added 'Life Drain' passive (+3 HP/kill). Healing Station explodes for 1000 DMG if destroyed by enemies. Cooldown 20s -> 25s.</li>
                        <li><strong>GUNNER:</strong> 'Dead Eye' cooldown 10s -> 15s.</li>
                    </ul>

                    <h3 style="color: #f0f;">BUG FIXES & UX</h3>
                    <ul style="margin-bottom: 1rem;">
                        <li><strong>Dead-eye:</strong> Fixed the bug where player has to press space twice.</li>
                        <li><strong>Visuals:</strong> Projectiles now match player colors (Cyan/Orange/Green).</li>
                        <li><strong>Railgun:</strong> Fixed penetration to max 2 targets.</li>
                        <li><strong>Bosses:</strong> Fixed Knockback immunity logic.</li>
                        <li><strong>Menu:</strong> Added 3D Flip Cards for Character Selection (Hover 'Stats >').</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button id="btn-patch-back" style="
                        background: #fff;
                        color: #000;
                        border: none;
                        padding: 0.5rem 2rem;
                        font-weight: bold;
                        cursor: pointer;
                    ">BACK</button>
                </div>
            </div>
        `;
        document.getElementById('btn-patch-back')!.onclick = () => this.showMainMenu();
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

        const confirmBtn = document.getElementById('btn-confirm-join') as HTMLButtonElement;
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const input = document.getElementById('join-room-id') as HTMLInputElement;
                const roomId = input.value.trim().toUpperCase(); // Ensure uppercase to match host

                if (roomId) {
                    confirmBtn.innerText = 'CONNECTING...';
                    confirmBtn.disabled = true;

                    this.game.networkSystem.joinRoom(roomId).then((success: boolean) => {
                        if (success) {
                            this.showLobby(false, roomId);
                        } else {
                            alert("Failed to join room. Verify the Room ID is correct and the host is active.");
                            confirmBtn.innerText = 'CONNECT TO HOST';
                            confirmBtn.disabled = false;
                        }
                    });
                } else {
                    alert("Please enter a valid Room ID.");
                }
            };
        }

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

                <div style="margin-top: 1rem;">
                    <button id="btn-exit-lobby" style="background: transparent; border: 1px solid #f44; color: #f44; padding: 0.5rem 2rem; cursor: pointer;">EXIT LOBBY</button>
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

        document.getElementById('btn-exit-lobby')!.onclick = () => this.game.menuSystem.showMainMenu();

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

        // Stats Definition
        let statsHTML = "";
        if (role === 'GUNNER') {
            statsHTML = `
                <div style="text-align:left; width:100%; font-size: 0.8rem; line-height: 1.4;">
                    <p><strong style="color:#fff;">HP:</strong> 100</p>
                    <p><strong style="color:#fff;">Speed:</strong> Very Fast (400)</p>
                    <p><strong style="color:#fff;">Ability:</strong> Dead Eye (15s)</p>
                    <p style="color:#aaa; font-size:0.7rem;">Slows time to 10%. Mark up to 3 targets. Manual trigger instantly kills them.</p>
                </div>
            `;
        }
        if (role === 'GIANT') {
            statsHTML = `
                <div style="text-align:left; width:100%; font-size: 0.8rem; line-height: 1.4;">
                    <p><strong style="color:#fff;">HP:</strong> 400</p>
                    <p><strong style="color:#fff;">Speed:</strong> Slow (220)</p>
                    <p><strong style="color:#fff;">Ability:</strong> Rage Mode (25s)</p>
                    <p style="color:#aaa; font-size:0.7rem;">Become Invincible for 5s. Gain 2x Speed, 2x Fire Rate, and 2x Damage.</p>
                </div>
            `;
        }
        if (role === 'HEALER') {
            statsHTML = `
                <div style="text-align:left; width:100%; font-size: 0.8rem; line-height: 1.4;">
                    <p><strong style="color:#fff;">HP:</strong> 120</p>
                    <p><strong style="color:#fff;">Speed:</strong> Fast (320)</p>
                    <p><strong style="color:#fff;">Ability:</strong> Medic Station (25s)</p>
                    <p style="color:#aaa; font-size:0.7rem;">Deploys a station with 1000 HP. Heals allies nearby. Explodes if destroyed by enemies.</p>
                </div>
            `;
        }

        const width = isSmall ? '45%' : '180px';
        const height = isSmall ? '180px' : '250px'; // Fixed height for consistent flip

        return `
            <div id="select-${role}" class="flip-card" style="width: ${width}; height: ${height}; cursor: ${isLocked ? 'not-allowed' : 'pointer'}; opacity: ${isLocked ? '0.5' : '1'}; perspective: 1000px; margin: 10px;">
                <div class="flip-card-inner" style="position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s; transform-style: preserve-3d;">
                    
                    <!-- Front -->
                    <div class="flip-card-front" style="
                        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                        -webkit-backface-visibility: hidden; backface-visibility: hidden;
                        border: 2px solid ${isLocked ? '#444' : (isSelected ? '#fff' : color)};
                        background: ${isSelected ? color + '44' : 'rgba(0,0,0,0.9)'};
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        box-shadow: ${isSelected ? '0 0 20px ' + color : 'none'};
                        z-index: 2;
                        box-sizing: border-box; /* IMPORTANT */
                    ">
                        
                        <div style="position: absolute; top: 10px; right: 10px; color: #fff; font-size: 0.7rem; opacity: 1; cursor: help; text-decoration: underline; padding: 5px; z-index: 10;"
                             onmouseenter="this.closest('.flip-card').querySelector('.flip-card-inner').style.transform='rotateY(180deg)'"
                             onmouseleave="this.closest('.flip-card').querySelector('.flip-card-inner').style.transform='rotateY(0deg)'"
                        >Stats &gt;</div>

                        <div style="font-size: ${isSmall ? '2rem' : '3rem'}; color: ${color};">
                            ${role === 'GUNNER' ? '⚡' : (role === 'GIANT' ? '🛡️' : '❤️')}
                        </div>
                        <h3 style="margin: 0; color: ${color}; font-size: ${isSmall ? '0.9rem' : '1.2rem'};">${role}</h3>
                        <p style="margin: 0; color: #fff; font-size: ${isSmall ? '0.7rem' : '0.9rem'}; opacity: 0.8;">${type}</p>
                        ${isLocked ? '<div style="color: #f00; font-size: 0.8rem; margin-top: 5px;">TAKEN</div>' : ''}
                    </div>

                    <!-- Back -->
                    <div class="flip-card-back" style="
                        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                        -webkit-backface-visibility: hidden; backface-visibility: hidden;
                        transform: rotateY(180deg);
                        border: 2px solid ${color}; 
                        background: #050505;
                        color: white;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        padding: 1rem;
                        box-sizing: border-box; /* IMPORTANT */
                    ">
                        <h4 style="color:${color}; margin-top:0; margin-bottom: 0.5rem; font-size: 1rem;">${role} STATS</h4>
                        ${statsHTML}
                    </div>
                </div>
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
