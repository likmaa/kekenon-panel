const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src/pages', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        let updated = content.replace(/className="([^"]*bg-primary text-marine[^"]*)"/g, function(match, classes) {
            let cls = classes.replace(/\bfont-semibold\b/g, '')
                             .replace(/\bfont-medium\b/g, '')
                             .replace(/\s+/g, ' ');
            if (!cls.includes('font-bold')) {
                cls += ' font-bold';
            }
            return 'className="' + cls.trim() + '"';
        });

        if (content !== updated) {
            fs.writeFileSync(filePath, updated);
            console.log('Updated fonts in ' + filePath);
        }
    }
});
