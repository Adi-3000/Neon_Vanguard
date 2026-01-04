export class InputHandler {
    keys: Set<string> = new Set();
    previousKeys: Set<string> = new Set();
    mouse: { x: number; y: number; isDown: boolean } = { x: 0, y: 0, isDown: false };
    canvas: HTMLCanvasElement;

    // Mobile Joystick
    joystick: { x: number, y: number, active: boolean, touchId: number | null } = { x: 0, y: 0, active: false, touchId: null };
    // Floating Aim Joystick (Right Side)
    aimJoystick: { x: number, y: number, active: boolean, touchId: number | null, startX: number, startY: number } = { x: 0, y: 0, active: false, touchId: null, startX: 0, startY: 0 };

    isMobile: boolean = false;
    private canvasRect: DOMRect;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.canvasRect = canvas.getBoundingClientRect();
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.setupListeners();
        if (this.isMobile) this.setupMobileHUD();

        window.addEventListener('resize', () => {
            this.canvasRect = this.canvas.getBoundingClientRect();
        });
    }

    private setupListeners() {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));

        const updateMousePosition = (clientX: number, clientY: number) => {
            const scaleX = this.canvas.width / this.canvasRect.width;
            const scaleY = this.canvas.height / this.canvasRect.height;
            this.mouse.x = (clientX - this.canvasRect.left) * scaleX;
            this.mouse.y = (clientY - this.canvasRect.top) * scaleY;
        };

        this.canvas.addEventListener('mousemove', (e) => updateMousePosition(e.clientX, e.clientY));
        this.canvas.addEventListener('mousedown', () => (this.mouse.isDown = true));
        window.addEventListener('mouseup', () => (this.mouse.isDown = false));

        // MULTI-TOUCH AIMING & FLOATING JOYSTICK (Right Side)
        const handleTouchAim = (e: TouchEvent) => {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                // Ignore the touch currently driving the movement joystick
                if (touch.identifier === this.joystick.touchId) continue;

                const scaleX = this.canvas.width / this.canvasRect.width;
                const tx = (touch.clientX - this.canvasRect.left) * scaleX;

                // If this is a new touch on the right half of the screen
                if (tx > this.canvasRect.width / 2) {
                    if (this.aimJoystick.touchId === null) {
                        this.aimJoystick.touchId = touch.identifier;
                        this.aimJoystick.startX = touch.clientX;
                        this.aimJoystick.startY = touch.clientY;
                        this.aimJoystick.active = true;
                    }

                    if (touch.identifier === this.aimJoystick.touchId) {
                        const dx = touch.clientX - this.aimJoystick.startX;
                        const dy = touch.clientY - this.aimJoystick.startY;
                        const dist = Math.hypot(dx, dy);

                        if (dist > 5) { // Small deadzone
                            this.aimJoystick.x = dx / (dist || 1);
                            this.aimJoystick.y = dy / (dist || 1);
                        }

                        this.mouse.isDown = true;
                        // Mock a mouse position far in that direction so existing aim code works
                        // Actually, Game.ts logic for mobile uses a specific check for joystick active.
                    }
                } else if (!this.aimJoystick.active) {
                    // Conventional tap-to-aim for left side touches that aren't the joystick
                    updateMousePosition(touch.clientX, touch.clientY);
                    this.mouse.isDown = true;
                }
            }

            // Cleanup aim joystick if touch ended
            let stillAiming = false;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.aimJoystick.touchId) stillAiming = true;
            }
            if (!stillAiming) {
                this.aimJoystick.active = false;
                this.aimJoystick.touchId = null;
                if (this.mouse.isDown) this.mouse.isDown = false;
            }
        };

        this.canvas.addEventListener('touchstart', (e) => handleTouchAim(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            handleTouchAim(e);
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => handleTouchAim(e));
    }

    private setupMobileHUD() {
        // HUD starts hidden, Game.ts will show it on startGame()

        const joyZone = document.getElementById('joystick-left');
        const stick = document.getElementById('stick-left');

        if (joyZone && stick) {
            const handleJoy = (touch: Touch) => {
                const rect = joyZone.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                let dx = touch.clientX - centerX;
                let dy = touch.clientY - centerY;
                const dist = Math.hypot(dx, dy);
                const maxDist = rect.width / 2;

                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }

                this.joystick.x = dx / maxDist;
                this.joystick.y = dy / maxDist;
                this.joystick.active = true;
                this.joystick.touchId = touch.identifier;

                stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            };

            joyZone.addEventListener('touchstart', (e) => {
                handleJoy(e.changedTouches[0]);
                e.stopPropagation();
            });
            joyZone.addEventListener('touchmove', (e) => {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === this.joystick.touchId) {
                        handleJoy(e.touches[i]);
                    }
                }
                e.preventDefault();
                e.stopPropagation();
            });
            joyZone.addEventListener('touchend', (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.joystick.touchId) {
                        this.joystick.x = 0;
                        this.joystick.y = 0;
                        this.joystick.active = false;
                        this.joystick.touchId = null;
                        stick.style.transform = `translate(-50%, -50%)`;
                    }
                }
            });
        }

        // Mobile Buttons
        const btnSpace = document.getElementById('mobile-ability');
        if (btnSpace) {
            btnSpace.addEventListener('touchstart', (e) => {
                this.keys.add('Space');
                e.stopPropagation();
            });
            btnSpace.addEventListener('touchend', (e) => {
                this.keys.delete('Space');
                e.stopPropagation();
            });
        }

        const btnArsenal = document.getElementById('mobile-arsenal');
        if (btnArsenal) {
            btnArsenal.addEventListener('touchstart', (e) => {
                this.keys.add('KeyX');
                e.stopPropagation();
            });
            btnArsenal.addEventListener('touchend', (e) => {
                this.keys.delete('KeyX');
                e.stopPropagation();
            });
        }

        const btnPause = document.getElementById('mobile-pause');
        if (btnPause) {
            btnPause.addEventListener('touchstart', (e) => {
                this.keys.add('Escape');
                e.stopPropagation();
            });
            btnPause.addEventListener('touchend', (e) => {
                this.keys.delete('Escape');
                e.stopPropagation();
            });
        }
    }

    update() {
        // Create a copy for next frame comparison
        this.previousKeys = new Set(this.keys);
    }

    isKeyDown(code: string): boolean {
        return this.keys.has(code);
    }

    isKeyPressed(code: string): boolean {
        return this.keys.has(code) && !this.previousKeys.has(code);
    }

    reset() {
        this.keys.clear();
        this.previousKeys.clear();
        this.mouse.isDown = false;
    }
}
