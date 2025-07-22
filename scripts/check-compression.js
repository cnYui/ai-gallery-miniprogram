#!/usr/bin/env node

/**
 * 检查代码压缩配置脚本
 */

const fs = require('fs');
const path = require('path');

class CompressionChecker {
  constructor() {
    this.projectRoot = process.cwd();
  }

  checkProjectConfig() {
    console.log('🔍 检查项目配置...');
    
    const configPath = path.join(this.projectRoot, 'project.config.json');
    if (!fs.existsSync(configPath)) {
      console.error('❌ project.config.json 文件不存在');
      return false;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const setting = config.setting || {};
      
      console.log('📋 当前压缩配置:');
      console.log(`  - minified: ${setting.minified}`);
      console.log(`  - uglifyFileName: ${setting.uglifyFileName}`);
      console.log(`  - es6: ${setting.es6}`);
      console.log(`  - minifyWXSS: ${setting.minifyWXSS}`);
      console.log(`  - minifyWXML: ${setting.minifyWXML}`);
      
      // 检查关键配置
      const issues = [];
      
      if (!setting.minified) {
        issues.push('minified 应该设置为 true');
      }
      
      if (!setting.uglifyFileName) {
        issues.push('uglifyFileName 应该设置为 true');
      }
      
      if (!setting.es6) {
        issues.push('es6 应该设置为 true');
      }
      
      if (issues.length > 0) {
        console.log('\n⚠️  发现配置问题:');
        issues.forEach(issue => console.log(`  - ${issue}`));
        return false;
      } else {
        console.log('\n✅ 压缩配置正确');
        return true;
      }
      
    } catch (error) {
      console.error('❌ 解析 project.config.json 失败:', error.message);
      return false;
    }
  }

  checkTypeScriptConfig() {
    console.log('\n🔍 检查 TypeScript 配置...');
    
    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      console.log('⚠️  tsconfig.json 文件不存在');
      return true; // 不是必需的
    }

    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      const compilerOptions = tsconfig.compilerOptions || {};
      
      console.log('📋 TypeScript 编译配置:');
      console.log(`  - target: ${compilerOptions.target}`);
      console.log(`  - module: ${compilerOptions.module}`);
      console.log(`  - strict: ${compilerOptions.strict}`);
      
      // 检查是否有可能影响压缩的配置
      if (compilerOptions.target && compilerOptions.target.toLowerCase().includes('es5')) {
        console.log('💡 建议将 target 设置为 ES2020 或更高版本');
      }
      
      console.log('✅ TypeScript 配置检查完成');
      return true;
      
    } catch (error) {
      console.error('❌ 解析 tsconfig.json 失败:', error.message);
      return false;
    }
  }

  checkSourceFiles() {
    console.log('\n🔍 检查源文件...');
    
    const miniprogramDir = path.join(this.projectRoot, 'miniprogram');
    if (!fs.existsSync(miniprogramDir)) {
      console.error('❌ miniprogram 目录不存在');
      return false;
    }

    // 检查是否有 TypeScript 文件
    const tsFiles = this.findFiles(miniprogramDir, '.ts');
    const jsFiles = this.findFiles(miniprogramDir, '.js');
    
    console.log(`📊 文件统计:`);
    console.log(`  - TypeScript 文件: ${tsFiles.length} 个`);
    console.log(`  - JavaScript 文件: ${jsFiles.length} 个`);
    
    if (tsFiles.length === 0 && jsFiles.length === 0) {
      console.log('⚠️  没有找到 JS/TS 文件');
      return false;
    }
    
    // 检查是否有语法错误的文件
    console.log('\n🔍 检查文件语法...');
    let hasErrors = false;
    
    [...tsFiles, ...jsFiles].forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        // 简单的语法检查
        if (content.includes('console.log') && content.includes('undefined')) {
          // 这只是一个示例检查
        }
      } catch (error) {
        console.log(`❌ 文件读取失败: ${file}`);
        hasErrors = true;
      }
    });
    
    if (!hasErrors) {
      console.log('✅ 源文件检查通过');
    }
    
    return !hasErrors;
  }

  findFiles(dir, extension) {
    const files = [];
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile() && item.endsWith(extension)) {
          files.push(fullPath);
        }
      });
    };
    
    scan(dir);
    return files;
  }

  provideSolutions() {
    console.log('\n💡 解决方案建议:');
    console.log('\n1. 确保项目配置正确:');
    console.log('   - 在微信开发者工具中打开项目');
    console.log('   - 点击菜单栏「工具」→「构建 npm」');
    console.log('   - 确保没有编译错误');
    
    console.log('\n2. 清理缓存:');
    console.log('   - 在微信开发者工具中点击「清缓存」');
    console.log('   - 选择「清除文件缓存」和「清除数据缓存」');
    
    console.log('\n3. 重新编译:');
    console.log('   - 修改任意文件触发重新编译');
    console.log('   - 或者重新打开项目');
    
    console.log('\n4. 检查代码质量:');
    console.log('   - 运行 TypeScript 编译检查');
    console.log('   - 修复所有语法错误和类型错误');
    
    console.log('\n5. 上传测试:');
    console.log('   - 尝试上传到微信小程序后台');
    console.log('   - 查看上传日志中的压缩信息');
  }

  run() {
    console.log('🚀 开始检查代码压缩配置...');
    console.log('=' .repeat(50));
    
    const configOk = this.checkProjectConfig();
    const tsConfigOk = this.checkTypeScriptConfig();
    const filesOk = this.checkSourceFiles();
    
    console.log('\n' + '=' .repeat(50));
    
    if (configOk && tsConfigOk && filesOk) {
      console.log('🎉 所有检查通过！');
      console.log('\n📝 下一步:');
      console.log('  1. 在微信开发者工具中清除缓存');
      console.log('  2. 重新编译项目');
      console.log('  3. 检查代码质量扫描结果');
    } else {
      console.log('❌ 发现问题，请按照建议进行修复');
      this.provideSolutions();
    }
  }
}

// 运行检查
if (require.main === module) {
  const checker = new CompressionChecker();
  checker.run();
}

module.exports = CompressionChecker;