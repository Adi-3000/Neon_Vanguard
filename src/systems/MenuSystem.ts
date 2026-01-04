import type { PlayerRole } from '../entities/Player';

export class MenuSystem {
    game: any;
    uiContainer: HTMLElement;

    constructor(game: any) {
        this.game = game;
        this.uiContainer = document.getElementById('ui-layer')!;
    }

    showMainMenu() {
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
                </div>

                <div style="margin-top: 3rem; color: #555; font-size: 0.8rem;">
                    v1.2 Mobile Refined
                </div>
            </div>
        `;

        document.getElementById('btn-start')!.onclick = () => this.showCharacterSelect();
        document.getElementById('btn-scores')!.onclick = () => this.showHighScores();
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
        return `
            <div id="select-${role}" style="
                border: 2px solid ${color};
                background: rgba(0,0,0,0.8);
                padding: ${isSmall ? '0.8rem' : '1.5rem'};
                cursor: pointer;
                transition: transform 0.2s;
                width: ${isSmall ? '100%' : '180px'};
                max-width: 280px;
            " onmouseover="this.style.transform='scale(1.05)'" 
              onmouseout="this.style.transform='scale(1)'">
                <h3 style="color:${color}; margin: 0;">${role}</h3>
                <p style="color:#ddd; font-size: 0.75rem; margin: 5px 0;">${type}</p>
                <hr style="border-color:${color}; margin: 0.5rem 0;">
                <p style="font-size:0.75rem; margin: 0;">Ability: <strong>${ability}</strong></p>
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
