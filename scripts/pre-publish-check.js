#!/usr/bin/env node

/**
 * 微信小程序发布前检查脚本
 * 自动检查项目配置、代码质量、功能完整性等
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PrePublishChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.projectRoot = process.cwd();
  }

  // 主检查流程
  async runChecks() {
    console.log('🚀 开始发布前检查...');
    console.log('=' .repeat(50));

    // 基础配置检查
    this.checkProjectConfig();
    this.checkAppConfig();
    this.checkCloudConfig();
    
    // 代码质量检查
    this.checkTypeScript();
    this.checkDependencies();
    
    // 功能完整性检查
    this.checkRequiredFiles();
    this.checkCloudFunctions();
    
    // 输出检查结果
    this.printResults();
    
    return this.errors.length === 0;
  }

  // 检查项目配置
  checkProjectConfig() {
    console.log('📋 检查项目配置...');
    
    const configPath = path.join(this.projectRoot, 'project.config.json');
    if (!fs.existsSync(configPath)) {
      this.errors.push('project.config.json 文件不存在');
      return;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // 检查 AppID
      if (!config.appid || config.appid === 'touristappid') {
        this.warnings.push('请配置正确的小程序 AppID');
      } else {
        this.passed.push('AppID 配置正确');
      }
      
      // 检查云函数根目录
      if (!config.cloudfunctionRoot) {
        this.warnings.push('未配置云函数根目录');
      } else {
        this.passed.push('云函数根目录配置正确');
      }
      
      // 检查 TypeScript 编译配置
      if (config.setting && config.setting.useCompilerPlugins && 
          config.setting.useCompilerPlugins.includes('typescript')) {
        this.passed.push('TypeScript 编译配置正确');
      } else {
        this.warnings.push('TypeScript 编译配置可能有问题');
      }
      
    } catch (error) {
      this.errors.push(`project.config.json 解析失败: ${error.message}`);
    }
  }

  // 检查应用配置
  checkAppConfig() {
    console.log('📱 检查应用配置...');
    
    const appJsonPath = path.join(this.projectRoot, 'miniprogram/app.json');
    if (!fs.existsSync(appJsonPath)) {
      this.errors.push('miniprogram/app.json 文件不存在');
      return;
    }

    try {
      const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      // 检查页面配置
      const requiredPages = ['pages/index/index', 'pages/create/create', 'pages/result/result', 'pages/profile/profile'];
      const missingPages = requiredPages.filter(page => !appConfig.pages.includes(page));
      
      if (missingPages.length > 0) {
        this.errors.push(`缺少必要页面: ${missingPages.join(', ')}`);
      } else {
        this.passed.push('所有必要页面配置正确');
      }
      
      // 检查云开发配置
      if (appConfig.cloud !== false) {
        this.passed.push('云开发配置已启用');
      } else {
        this.warnings.push('云开发配置未启用');
      }
      
    } catch (error) {
      this.errors.push(`app.json 解析失败: ${error.message}`);
    }
  }

  // 检查云开发配置
  checkCloudConfig() {
    console.log('☁️ 检查云开发配置...');
    
    const appTsPath = path.join(this.projectRoot, 'miniprogram/app.ts');
    if (!fs.existsSync(appTsPath)) {
      this.errors.push('miniprogram/app.ts 文件不存在');
      return;
    }

    const appTsContent = fs.readFileSync(appTsPath, 'utf8');
    
    // 检查云开发初始化
    if (appTsContent.includes('wx.cloud.init')) {
      this.passed.push('云开发初始化配置正确');
    } else {
      this.errors.push('缺少云开发初始化配置');
    }
    
    // 检查环境ID
    const envMatch = appTsContent.match(/env:\s*['"]([^'"]+)['"]/);;
    if (envMatch && envMatch[1] !== 'your-env-id') {
      this.passed.push(`云开发环境ID: ${envMatch[1]}`);
    } else {
      this.warnings.push('请配置正确的云开发环境ID');
    }
  }

  // 检查 TypeScript
  checkTypeScript() {
    console.log('🔍 检查 TypeScript...');
    
    try {
      // 检查 tsconfig.json
      const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        this.passed.push('tsconfig.json 配置存在');
      } else {
        this.warnings.push('tsconfig.json 配置文件不存在');
      }
      
      // 运行 TypeScript 编译检查
      execSync('npx tsc --noEmit --skipLibCheck', { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      this.passed.push('TypeScript 编译检查通过');
      
    } catch (error) {
      this.errors.push('TypeScript 编译检查失败，请修复类型错误');
    }
  }

  // 检查依赖
  checkDependencies() {
    console.log('📦 检查项目依赖...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.warnings.push('package.json 文件不存在');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 检查必要依赖
      const requiredDeps = ['tdesign-miniprogram', 'miniprogram-api-typings'];
      const missingDeps = requiredDeps.filter(dep => 
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      );
      
      if (missingDeps.length > 0) {
        this.warnings.push(`缺少推荐依赖: ${missingDeps.join(', ')}`);
      } else {
        this.passed.push('项目依赖配置正确');
      }
      
    } catch (error) {
      this.warnings.push(`package.json 解析失败: ${error.message}`);
    }
  }

  // 检查必要文件
  checkRequiredFiles() {
    console.log('📁 检查必要文件...');
    
    const requiredFiles = [
      'miniprogram/app.ts',
      'miniprogram/app.json',
      'miniprogram/app.wxss',
      'miniprogram/pages/index/index.ts',
      'miniprogram/pages/index/index.wxml',
      'miniprogram/pages/index/index.wxss',
      'miniprogram/pages/create/create.ts',
      'miniprogram/pages/result/result.ts',
      'miniprogram/pages/profile/profile.ts'
    ];
    
    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(this.projectRoot, file))
    );
    
    if (missingFiles.length > 0) {
      this.errors.push(`缺少必要文件: ${missingFiles.join(', ')}`);
    } else {
      this.passed.push('所有必要文件存在');
    }
  }

  // 检查云函数
  checkCloudFunctions() {
    console.log('⚡ 检查云函数...');
    
    const cloudFunctionDir = path.join(this.projectRoot, 'cloudfunctions');
    if (!fs.existsSync(cloudFunctionDir)) {
      this.warnings.push('cloudfunctions 目录不存在');
      return;
    }

    const requiredFunctions = ['login', 'text2image'];
    const existingFunctions = fs.readdirSync(cloudFunctionDir)
      .filter(item => fs.statSync(path.join(cloudFunctionDir, item)).isDirectory());
    
    const missingFunctions = requiredFunctions.filter(func => 
      !existingFunctions.includes(func)
    );
    
    if (missingFunctions.length > 0) {
      this.warnings.push(`缺少云函数: ${missingFunctions.join(', ')}`);
    } else {
      this.passed.push('所有必要云函数存在');
    }
    
    // 检查云函数配置
    requiredFunctions.forEach(funcName => {
      const funcDir = path.join(cloudFunctionDir, funcName);
      if (fs.existsSync(funcDir)) {
        const packageJsonPath = path.join(funcDir, 'package.json');
        const indexPath = path.join(funcDir, 'index.js');
        
        if (!fs.existsSync(packageJsonPath)) {
          this.warnings.push(`${funcName} 云函数缺少 package.json`);
        }
        
        if (!fs.existsSync(indexPath)) {
          this.warnings.push(`${funcName} 云函数缺少 index.js`);
        }
      }
    });
  }

  // 输出检查结果
  printResults() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 检查结果汇总');
    console.log('=' .repeat(50));
    
    if (this.passed.length > 0) {
      console.log('\n✅ 通过的检查:');
      this.passed.forEach(item => console.log(`  ✓ ${item}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.warnings.forEach(item => console.log(`  ⚠ ${item}`));
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ 错误:');
      this.errors.forEach(item => console.log(`  ✗ ${item}`));
    }
    
    console.log('\n' + '=' .repeat(50));
    
    if (this.errors.length === 0) {
      console.log('🎉 恭喜！项目已准备好发布！');
      console.log('\n📝 下一步:');
      console.log('  1. 在微信开发者工具中打开项目');
      console.log('  2. 点击「上传」按钮');
      console.log('  3. 填写版本号和项目备注');
      console.log('  4. 在小程序管理后台提交审核');
    } else {
      console.log('❌ 发现问题，请修复后再发布！');
      process.exit(1);
    }
  }
}

// 运行检查
if (require.main === module) {
  const checker = new PrePublishChecker();
  checker.runChecks().catch(error => {
    console.error('检查过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = PrePublishChecker;