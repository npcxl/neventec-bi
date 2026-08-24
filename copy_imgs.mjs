import fs from 'fs';
import path from 'path';
const dir = 'c:\\codes\\neventec-bi\\public\\img';
const map = {
  '未选中-横板.png': 'landscape-unselected.png',
  '未选中-竖版.png': 'portrait-unselected.png',
  '选中-横板.png': 'landscape-selected.png',
  '选中-竖版.png': 'portrait-selected.png',
};
for (const [k, v] of Object.entries(map)) {
  const src = path.join(dir, k);
  const dst = path.join(dir, v);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    fs.unlinkSync(src);
    console.log('renamed', k, '->', v);
  } else {
    console.log('missing', k);
  }
}
console.log('png files:', fs.readdirSync(dir).filter((f) => f.endsWith('.png')));
