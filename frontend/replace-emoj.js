import fs from 'fs';
import path from 'path';

const map = {
  '🎉': 'FaTrophy',
  '✨': 'FaStar',
  '💪': 'FaDumbbell',
  '📈': 'FaChartLine',
  '💡': 'FaLightbulb',
  '🌐': 'FaGlobe',
  '🏁': 'FaFlagCheckered',
  '👤': 'FaUser',
  '🤖': 'FaRobot',
  '⏹': 'FaStop',
  '🎤': 'FaMicrophone',
  '➤': 'FaPaperPlane',
  '🤝': 'FaHandshake',
  '🎯': 'FaBullseye',
  '⏱': 'FaStopwatch',
  '📋': 'FaClipboardList',
  '🚀': 'FaRocket',
  '✓': 'FaCheck',
  '✕': 'FaTimes',
  '⚡': 'FaBolt',
  '📊': 'FaChartBar',
  '🏆': 'FaTrophy',
  '🌟': 'FaStar',
  '👥': 'FaUsers',
  '⚔️': 'FaBolt',
  '💬': 'FaComment',
  '📝': 'FaPen',
  '🔥': 'FaFire',
  '👑': 'FaCrown',
  '🚪': 'FaDoorOpen',
  '➕': 'FaPlus',
  '★': 'FaStar',
  '⭐': 'FaStar',
  '✦': 'FaStar',
  '👍': 'FaThumbsUp',
  '👎': 'FaThumbsDown'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('D:/FSD/SAAS/frontend/src/pages');
files.push('D:/FSD/SAAS/frontend/src/components/Navbar/Navbar.jsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let usedHooks = new Set();

  Object.keys(map).forEach(emoji => {
    const component = map[emoji];
    
    // Pattern 1: Emoji inside single or double quotes
    // e.g. '{ending ? "🏁 End & Evaluate" : ...}' -> '{ending ? <><FaFlagCheckered /> End & Evaluate</> : ...}'
    const strRegex = new RegExp(`(['"])([^'"]*?)${emoji}([^'"]*?)(['"])`, 'g');
    content = content.replace(strRegex, (match, p1, p2, p3, p4) => {
      usedHooks.add(component);
      const textAfter = p3.trim().length > 0 ? ` ${p3.trim()}` : p3.trim() === '' && p3.length > 0 ? ' ' : '';
      const textBefore = p2.trim().length > 0 ? `${p2.trim()} ` : p2.trim() === '' && p2.length > 0 ? ' ' : '';
      return `<><${component} />${textBefore ? ' ' + textBefore : ''}${textAfter ? textAfter + ' ' : ''}</>`;
    });

    // Pattern 2: Emoji plain in JSX
    if (content.includes(emoji)) {
      usedHooks.add(component);
      const regex = new RegExp(emoji, 'g');
      content = content.replace(regex, `<${component} />`);
    }
  });

  if (usedHooks.size > 0 && content !== originalContent) {
    const imports = `import { ${Array.from(usedHooks).join(', ')} } from 'react-icons/fa';`;
    const lines = content.split('\n');
    let injectIdx = 0;
    
    // Add import statement after the last import
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
            injectIdx = i;
        }
    }
    
    // Don't inject if already imported
    const currentImports = lines.filter(l => l.includes('react-icons/fa')).join('');
    Array.from(usedHooks).forEach(hook => {
       if (!currentImports.includes(hook)) {
          lines.splice(injectIdx + 1, 0, `import { ${hook} } from 'react-icons/fa';`);
       }
    });

    fs.writeFileSync(file, lines.join('\n'));
    console.log('Updated ' + file + ' with ' + Array.from(usedHooks).join(', '));
  }
});
