class VirtualBubbleWrap {
    constructor() {
        this.bubbleField = document.getElementById('bubble-field');
        this.popCountElement = document.getElementById('pop-count');
        this.resetBtn = document.getElementById('reset-btn');
        this.popCount = 0;
        this.audioContext = null;
        this.bubbles = [];
        
        this.init();
    }
    
    init() {
        this.initAudio();
        this.generateBubbles();
        this.bindEvents();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported');
        }
    }
    
    generateBubbles() {
        // Calculate how many bubbles we need based on screen size
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Account for header and footer space
        const availableHeight = viewportHeight - 180;
        
        // Calculate grid dimensions
        const bubbleSize = viewportWidth < 480 ? 40 : viewportWidth < 768 ? 45 : 55;
        const gap = viewportWidth < 480 ? 4 : viewportWidth < 768 ? 6 : 8;
        
        const bubblesPerRow = Math.floor((viewportWidth - 32) / (bubbleSize + gap));
        const rows = Math.floor(availableHeight / (bubbleSize + gap));
        const totalBubbles = bubblesPerRow * rows;
        
        // Clear existing bubbles
        this.bubbleField.innerHTML = '';
        this.bubbles = [];
        
        // Generate bubbles
        for (let i = 0; i < totalBubbles; i++) {
            const bubble = this.createBubble(i);
            this.bubbles.push(bubble);
            this.bubbleField.appendChild(bubble);
        }
    }
    
    createBubble(index) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.setProperty('--delay', Math.random() * 20);
        bubble.dataset.index = index;
        bubble.dataset.popped = 'false';
        
        // Add slight random variations to make it more organic
        const sizeVariation = 0.9 + Math.random() * 0.2;
        bubble.style.transform = `scale(${sizeVariation})`;
        
        return bubble;
    }
    
    bindEvents() {
        // Remove any existing event listeners to prevent duplicates
        this.bubbleField.removeEventListener('click', this.handleBubbleClick);
        
        // Bubble click events using event delegation
        this.handleBubbleClick = (e) => {
            if (e.target.classList.contains('bubble') && e.target.dataset.popped === 'false') {
                this.popBubble(e.target);
            }
        };
        
        this.bubbleField.addEventListener('click', this.handleBubbleClick);
        
        // Reset button - remove existing listener first
        this.resetBtn.removeEventListener('click', this.handleReset);
        this.handleReset = () => {
            this.resetBubbles();
        };
        this.resetBtn.addEventListener('click', this.handleReset);
        
        // Handle window resize
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        this.resizeHandler = () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.generateBubbles();
                this.bindEvents(); // Re-bind events after regenerating
            }, 250);
        };
        
        window.addEventListener('resize', this.resizeHandler);
        
        // Initialize audio context on first user interaction
        if (!this.audioInitialized) {
            document.addEventListener('click', () => {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
            this.audioInitialized = true;
        }
    }
    
    popBubble(bubble) {
        if (bubble.dataset.popped === 'true') return;
        
        bubble.dataset.popped = 'true';
        bubble.classList.add('popped');
        
        // Play soft pop sound
        this.playPopSound();
        
        // Update counter
        this.popCount++;
        this.updateCounter();
        
        // Keep the popped state visible instead of hiding
        setTimeout(() => {
            bubble.style.opacity = '0.3';
            bubble.style.transform = 'scale(0.8)';
            bubble.style.background = 'var(--calm-bubble-3)';
            bubble.style.cursor = 'default';
        }, 200);
    }
    
    playPopSound() {
        if (!this.audioContext) return;
        
        try {
            // Create a soft, calming pop sound
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            // Connect audio nodes
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configure the sound for a soft, gentle pop
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800 + Math.random() * 400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
            
            // Soft low-pass filter for warmth
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            filterNode.Q.setValueAtTime(0.5, this.audioContext.currentTime);
            
            // Gentle envelope for soft attack and decay
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
            
            // Start and stop the sound
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
            
            // Add some subtle white noise for texture
            const noiseBuffer = this.createNoiseBuffer();
            const noiseSource = this.audioContext.createBufferSource();
            const noiseGain = this.audioContext.createGain();
            const noiseFilter = this.audioContext.createBiquadFilter();
            
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.audioContext.destination);
            
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(800, this.audioContext.currentTime);
            
            noiseGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            noiseGain.gain.linearRampToValueAtTime(0.02, this.audioContext.currentTime + 0.005);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
            
            noiseSource.start(this.audioContext.currentTime);
            noiseSource.stop(this.audioContext.currentTime + 0.05);
            
        } catch (error) {
            console.warn('Error playing pop sound:', error);
        }
    }
    
    createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        return buffer;
    }
    
    updateCounter() {
        this.popCountElement.textContent = this.popCount;
        
        // Add a gentle pulse animation to the counter
        this.popCountElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.popCountElement.style.transform = 'scale(1)';
        }, 150);
    }
    
    resetBubbles() {
        // Reset counter
        this.popCount = 0;
        this.updateCounter();
        
        // Regenerate all bubbles with a gentle fade effect
        this.bubbleField.style.opacity = '0';
        
        setTimeout(() => {
            this.generateBubbles();
            this.bindEvents(); // Re-bind events after regenerating bubbles
            this.bubbleField.style.opacity = '1';
        }, 250);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VirtualBubbleWrap();
});

// Add smooth transitions to counter
document.addEventListener('DOMContentLoaded', () => {
    const counter = document.getElementById('pop-count');
    if (counter) {
        counter.style.transition = 'transform 150ms ease-out';
    }
});