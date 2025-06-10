const fs = require('fs');
const path = require('path');

try {
    // Read the original English file
    const enPath = path.join(__dirname, '../src/assets/lang/en.json');
    const overridePath = path.join(__dirname, '../src/assets/lang/en-aspire-override.json');
    
    // Try to read original from en-us.json if en.json is corrupted
    let enOriginal;
    try {
        enOriginal = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    } catch (e) {
        console.log('⚠️  en.json is corrupted, using en-us.json as source');
        const enUsPath = path.join(__dirname, '../src/assets/lang/en-us.json');
        enOriginal = JSON.parse(fs.readFileSync(enUsPath, 'utf8'));
    }
    
    // Create backup
    fs.writeFileSync(path.join(__dirname, '../src/assets/lang/en-backup.json'), JSON.stringify(enOriginal, null, 2));
    
    // Read override file
    const overrides = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
    
    // Merge overrides into original
    const merged = { ...enOriginal, ...overrides };
    
    // Write back
    fs.writeFileSync(enPath, JSON.stringify(merged, null, 2));
    
    console.log('✅ Aspire School language overrides applied successfully!');
    console.log(`📝 ${Object.keys(overrides).length} strings customized`);
} catch (error) {
    console.error('❌ Error applying overrides:', error.message);
}