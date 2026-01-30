// Chat Component

export interface ChatMessage {
    name: string;
    message: string;
    isSystem?: boolean;
}

export interface ChatCallbacks {
    onSendMessage: (message: string) => void;
}

export class ChatComponent {
    private container: HTMLElement;
    private messagesContainer: HTMLElement;
    private input: HTMLInputElement;
    private isOpen: boolean = false;
    private isSetup: boolean = false;

    // Store handlers for cleanup
    private handlers: {
        keydown: ((e: KeyboardEvent) => void) | null;
        keyup: ((e: KeyboardEvent) => void) | null;
        focus: (() => void) | null;
        blur: (() => void) | null;
    } = { keydown: null, keyup: null, focus: null, blur: null };

    constructor() {
        this.container = document.getElementById('chat')!;
        this.messagesContainer = document.getElementById('chatMessages')!;
        this.input = document.getElementById('chatInput') as HTMLInputElement;
    }

    setup(callbacks: ChatCallbacks): void {
        // Prevent duplicate setup
        if (this.isSetup) {
            this.cleanup();
        }

        this.handlers.keydown = (e: KeyboardEvent): void => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                const message = this.input.value.trim();
                if (message) {
                    callbacks.onSendMessage(message);
                    this.input.value = '';
                }
                this.close();
                e.preventDefault();
            } else if (e.key === 'Escape') {
                this.close();
                e.preventDefault();
            }
        };

        this.handlers.keyup = (e: KeyboardEvent): void => {
            e.stopPropagation();
        };

        this.handlers.focus = (): void => {
            this.isOpen = true;
        };

        this.handlers.blur = (): void => {
            this.isOpen = false;
        };

        this.input.addEventListener('keydown', this.handlers.keydown);
        this.input.addEventListener('keyup', this.handlers.keyup);
        this.input.addEventListener('focus', this.handlers.focus);
        this.input.addEventListener('blur', this.handlers.blur);

        this.isSetup = true;
    }

    cleanup(): void {
        if (this.handlers.keydown) {
            this.input.removeEventListener('keydown', this.handlers.keydown);
        }
        if (this.handlers.keyup) {
            this.input.removeEventListener('keyup', this.handlers.keyup);
        }
        if (this.handlers.focus) {
            this.input.removeEventListener('focus', this.handlers.focus);
        }
        if (this.handlers.blur) {
            this.input.removeEventListener('blur', this.handlers.blur);
        }
        this.handlers = { keydown: null, keyup: null, focus: null, blur: null };
        this.isSetup = false;
    }

    setupToggle(): { element: Element; handler: EventListener } | null {
        const header = document.getElementById('chat-header');
        const toggle = document.getElementById('chat-toggle');
        const content = document.getElementById('chat-content');

        if (header && toggle && content) {
            const handler = (): void => {
                toggle.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
            };
            header.addEventListener('click', handler);
            return { element: header, handler };
        }
        return null;
    }

    show(): void {
        this.container.classList.remove('hidden');
    }

    hide(): void {
        this.container.classList.add('hidden');
    }

    open(): void {
        this.input.focus();
    }

    close(): void {
        this.input.blur();
    }

    isActive(): boolean {
        return this.isOpen;
    }

    addMessage(msg: ChatMessage): void {
        const msgEl = document.createElement('div');
        msgEl.className = 'chat-message';

        if (msg.isSystem) {
            const em = document.createElement('em');
            em.textContent = msg.message;
            msgEl.appendChild(em);
        } else {
            const strong = document.createElement('strong');
            strong.textContent = msg.name + ':';
            msgEl.appendChild(strong);
            msgEl.appendChild(document.createTextNode(' ' + msg.message));
        }

        this.messagesContainer.appendChild(msgEl);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        // Limit messages in DOM
        while (this.messagesContainer.children.length > 50) {
            this.messagesContainer.removeChild(this.messagesContainer.firstChild!);
        }
    }

    addSystemMessage(message: string): void {
        this.addMessage({ name: '', message, isSystem: true });
    }

    clear(): void {
        this.messagesContainer.innerHTML = '';
    }
}
