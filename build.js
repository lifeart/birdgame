const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isProduction = process.argv.includes('--prod');
const isDev = !isProduction;

// Minify CSS using esbuild
async function minifyCSS(cssContent) {
    const result = await esbuild.transform(cssContent, {
        loader: 'css',
        minify: true,
    });
    return result.code;
}

// Generate build version based on timestamp
function generateBuildVersion() {
    const now = new Date();
    return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}${now.getMinutes()}`;
}

async function build() {
    console.log(`Building (${isProduction ? 'production' : 'development'})...`);

    const buildVersion = generateBuildVersion();
    console.log(`Build version: ${buildVersion}`);

    // Ensure dist directory exists
    const distDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    try {
        // Bundle server
        console.log(`Bundling server${isProduction ? ' (minified)' : ''}...`);
        await esbuild.build({
            entryPoints: ['server.js'],
            bundle: true,
            platform: 'node',
            target: 'node18',
            outfile: 'dist/server.js',
            minify: isProduction,
            sourcemap: !isProduction,
            external: [],
            define: {
                'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
            },
            logLevel: 'info'
        });

        // Copy public folder structure (excluding JS/TS files - they'll be bundled)
        const publicSrc = path.join(__dirname, 'public');
        const publicDest = path.join(distDir, 'public');

        // Ensure public/js directory exists in dist
        const jsDestDir = path.join(publicDest, 'js');
        if (!fs.existsSync(jsDestDir)) {
            fs.mkdirSync(jsDestDir, { recursive: true });
        }

        // Copy non-JS/TS files
        copyDir(publicSrc, publicDest, ['.js', '.ts']);
        console.log('Copied public folder to dist/ (excluding JS/TS)');

        // Bundle client-side TypeScript
        console.log('Bundling client-side TypeScript...');
        await esbuild.build({
            entryPoints: [path.join(__dirname, 'public', 'js', 'main.ts')],
            bundle: true,
            format: 'iife',
            target: 'es2020',
            outfile: path.join(jsDestDir, 'bundle.js'),
            minify: isProduction,
            sourcemap: isDev ? 'inline' : false,
            logLevel: 'info',
            // THREE.js is now bundled from node_modules
            external: [],
            define: {
                'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
            }
        });

        // Update index.html to use bundle
        updateIndexHtml(publicDest);

        if (isProduction) {
            // Minify CSS files
            console.log('Minifying CSS...');
            await minifyAllCSS(publicDest);

            // Update service worker version for cache invalidation
            console.log('Updating service worker version...');
            updateServiceWorkerVersion(publicDest, buildVersion);
        }

        // Print build summary
        console.log('\n✓ Build complete!');
        console.log('─'.repeat(40));

        const serverStats = fs.statSync(path.join(distDir, 'server.js'));
        console.log(`  Server bundle: ${(serverStats.size / 1024).toFixed(2)} KB`);

        const clientPath = path.join(publicDest, 'js', 'bundle.js');
        if (fs.existsSync(clientPath)) {
            const clientStats = fs.statSync(clientPath);
            console.log(`  Client bundle: ${(clientStats.size / 1024).toFixed(2)} KB`);
        }

        // Calculate total dist size
        const totalSize = getDirSize(distDir);
        console.log(`  Total dist size: ${(totalSize / 1024).toFixed(2)} KB`);

        console.log('─'.repeat(40));
        console.log(`Run with: npm run ${isProduction ? 'start:prod' : 'start'}`);

    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

function updateIndexHtml(publicDest) {
    const indexPath = path.join(publicDest, 'index.html');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

    // index.html already references bundle.js directly (three.js bundled from npm)
    fs.writeFileSync(indexPath, indexHtml);
    console.log('Copied index.html (uses bundled JS with three.js from npm)');
}

async function minifyAllCSS(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await minifyAllCSS(fullPath);
        } else if (entry.name.endsWith('.css')) {
            const originalSize = fs.statSync(fullPath).size;
            const cssContent = fs.readFileSync(fullPath, 'utf8');
            const minified = await minifyCSS(cssContent);
            fs.writeFileSync(fullPath, minified);
            const newSize = fs.statSync(fullPath).size;
            const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
            console.log(`  ${entry.name}: ${(originalSize / 1024).toFixed(2)} KB → ${(newSize / 1024).toFixed(2)} KB (${savings}% smaller)`);
        }
    }
}

function getDirSize(dir) {
    let totalSize = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            totalSize += getDirSize(fullPath);
        } else {
            totalSize += fs.statSync(fullPath).size;
        }
    }
    return totalSize;
}

function updateServiceWorkerVersion(publicDest, version) {
    const swPath = path.join(publicDest, 'sw.js');
    if (fs.existsSync(swPath)) {
        let swContent = fs.readFileSync(swPath, 'utf8');
        // Replace version in CACHE_NAME
        swContent = swContent.replace(
            /const CACHE_NAME = 'birdgame-v[^']+'/,
            `const CACHE_NAME = 'birdgame-v${version}'`
        );
        fs.writeFileSync(swPath, swContent);
        console.log(`  Service worker cache version: birdgame-v${version}`);
    }
}

function copyDir(src, dest, skipExtensions = []) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            // Skip js directory entirely if we're skipping .js/.ts files
            // We'll create bundle.js separately
            if (entry.name === 'js' && (skipExtensions.includes('.js') || skipExtensions.includes('.ts'))) {
                continue;
            }
            copyDir(srcPath, destPath, skipExtensions);
        } else {
            const ext = path.extname(entry.name);
            // Always copy sw.js (service worker), skip other JS/TS files
            const isServiceWorker = entry.name === 'sw.js';
            if (isServiceWorker || !skipExtensions.includes(ext)) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

build();
