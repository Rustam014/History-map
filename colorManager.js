const ColorManager = {
    storageKey: 'countryColors',
    defaultColors: {},

    generateColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 50%)`;
    },

    getColor(countryName) {
        const colors = this.loadColors();
        if (!colors[countryName]) {
            colors[countryName] = this.generateColor();
            this.saveColors(colors);
        }
        return colors[countryName];
    },

    setCustomColor(countryName, color) {
        const colors = this.loadColors();
        colors[countryName] = color;
        this.saveColors(colors);
    },

    loadColors() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : { ...this.defaultColors };
    },

    saveColors(colors) {
        localStorage.setItem(this.storageKey, JSON.stringify(colors));
    },

    resetColors() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.defaultColors));
    }
}; 