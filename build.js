const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isProduction = process.argv.includes('--prod');
const bundleClient = process.argv.includes('--client') || isProduction;

// Minify CSS using esbuild
async function minifyCSS(cssContent) {
    const result = await esbuild.transform(cssContent, {
        loader: 'css',
        minify: true,
    });
    return result.code;
}

async function build() {
    console.log(`Building (${isProduction ? 'production' : 'development'})...`);

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

        // Copy public folder structure
        const publicSrc = path.join(__dirname, 'public');
        const publicDest = path.join(distDir, 'public');

        if (isProduction) {
            // For production, copy files (will overwrite JS with bundle)
            copyDir(publicSrc, publicDest, bundleClient ? ['.js'] : []);
            console.log('Copied public folder to dist/');

            // Bundle client-side JS
            if (bundleClient) {
                console.log('Bundling client-side JavaScript...');
                await bundleClientJS(publicDest);
            }

            // Minify CSS files
            console.log('Minifying CSS...');
            await minifyAllCSS(publicDest);
        } else {
            // For development, create symlink
            if (fs.existsSync(publicDest)) {
                fs.rmSync(publicDest, { recursive: true });
            }
            fs.symlinkSync(publicSrc, publicDest, 'dir');
            console.log('Created symlink for public folder');
        }

        // Print build summary
        console.log('\n✓ Build complete!');
        console.log('─'.repeat(40));

        if (isProduction) {
            const serverStats = fs.statSync(path.join(distDir, 'server.js'));
            console.log(`  Server bundle: ${(serverStats.size / 1024).toFixed(2)} KB`);

            if (bundleClient) {
                const clientPath = path.join(publicDest, 'js', 'bundle.js');
                if (fs.existsSync(clientPath)) {
                    const clientStats = fs.statSync(clientPath);
                    console.log(`  Client bundle: ${(clientStats.size / 1024).toFixed(2)} KB`);
                }
            }

            // Calculate total dist size
            const totalSize = getDirSize(distDir);
            console.log(`  Total dist size: ${(totalSize / 1024).toFixed(2)} KB`);
        }

        console.log('─'.repeat(40));
        console.log('Run with: npm run start:prod');

    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

async function bundleClientJS(publicDest) {
    const jsDir = path.join(publicDest, 'js');

    // Client JS files in load order
    const clientFiles = [
        'audio.js',
        'progression.js',
        'rewards.js',
        'effects.js',
        'bird.js',
        'world.js',
        'worms.js',
        'flies.js',
        'weather.js',
        'locations.js',
        'network.js',
        'ui.js',
        'touch.js',
        'game.js',
        'main.js'
    ];

    // Create a temporary entry file that imports all modules
    const entryContent = clientFiles
        .map(f => `// ${f}\n` + fs.readFileSync(path.join(__dirname, 'public', 'js', f), 'utf8'))
        .join('\n\n');

    const tempEntry = path.join(jsDir, '_entry.js');
    fs.writeFileSync(tempEntry, entryContent);

    // Bundle
    await esbuild.build({
        entryPoints: [tempEntry],
        bundle: false,
        minify: true,
        outfile: path.join(jsDir, 'bundle.js'),
        target: 'es2020',
        format: 'iife',
        logLevel: 'info'
    });

    // Remove temp file
    fs.unlinkSync(tempEntry);

    // Update index.html to use bundle
    const indexPath = path.join(publicDest, 'index.html');
    let indexHtml = fs.readFileSync(indexPath, 'utf8');

    // Replace individual script tags with bundle
    const scriptRegex = /<script src="js\/(audio|progression|rewards|effects|bird|world|worms|flies|weather|locations|network|ui|touch|game|main)\.js"><\/script>\s*/g;
    indexHtml = indexHtml.replace(scriptRegex, '');

    // Add bundle script before closing body
    indexHtml = indexHtml.replace(
        '</body>',
        '    <script src="js/bundle.js"></script>\n</body>'
    );

    fs.writeFileSync(indexPath, indexHtml);
    console.log('Updated index.html to use bundled JS');
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

function copyDir(src, dest, skipExtensions = []) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            // Skip js directory if we're bundling client (we'll handle it separately)
            if (entry.name === 'js' && skipExtensions.includes('.js')) {
                fs.mkdirSync(destPath, { recursive: true });
                continue;
            }
            copyDir(srcPath, destPath, skipExtensions);
        } else {
            const ext = path.extname(entry.name);
            if (!skipExtensions.includes(ext)) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

build();
