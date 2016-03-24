var _ = fis.util;
var watch = require('./lib/watch.js');
var release = require('./lib/release.js');
var deploy = require('./lib/deploy.js');
var livereload = require('./lib/livereload.js');
var time = require('./lib/time.js');
var fs = require('fs');

exports.name = 'release [media name]';
exports.desc = 'build and deploy your project';
exports.options = {
  '-h, --help': 'print this help message',
  '-d, --dest <path>': 'release output destination',
  '-l, --lint': 'with lint',
  '-w, --watch': 'monitor the changes of project',
  '-L, --live': 'automatically reload your browser',
  '-c, --clean': 'clean compile cache',
  '-u, --unique': 'use unique compile caching',
  '-r, --root <path>': 'specify project root',
  '-f, --file <filename>': 'specify the file path of `fis-conf.js`',
  '--no-color': 'disable colored output',
  '--verbose': 'enable verbose mode'
};

var pth = require('path');

function getServerInfo() {
  var conf = pth.join(fis.project.getTempPath('server'), 'conf.json');
  if (fis.util.isFile(conf)) {
    return fis.util.readJSON(conf);
  }
  return {};
}
//当options.dest不设置或为preview时，构建后的代码放在serverRoot下
var serverRoot = (function() {
  var key = 'FIS_SERVER_DOCUMENT_ROOT';
  var serverInfo = getServerInfo();
  if (process.env && process.env[key]) {
    var path = process.env[key];
    if (fis.util.exists(path) && !fis.util.isDir(path)) {
      fis.log.error('invalid environment variable [' + key + '] of document root [' + path + ']');
    }
    return path;
  } else if (serverInfo['root'] && fis.util.is(serverInfo['root'], 'String')) {
    return serverInfo['root'];
  } else {
    return fis.project.getTempPath('www');
  }
})();

exports.run = function(argv, cli, env) {

  // 显示帮助信息
  if (argv.h || argv.help) {
    return cli.help(exports.name, exports.options);
  }

  validate(argv);

  // normalize options
  var options = {
    dest: argv.dest || argv.d || fis.media().get('release.dir') || 'preview',
    watch: !!(argv.watch || argv.w || fis.media().get('release.watch')),
    live: !!(argv.live || argv.L || fis.media().get('release.live')),
    clean: !!(argv.clean || argv.c || fis.media().get('release.clean')),
    unique: !!(argv.unique || argv.u),
    useLint: !!(argv.lint || argv.l || fis.media().get('release.lint')),
    verbose: !!argv.verbose,
    clear: !!fis.media().get('release.clear')
  };

  //打印出当前relese的各参数
  var dest = options.dest === 'preview' ? serverRoot: options.dest;
  fis.log.info('当前release的输出路径为:%s',dest);

  // enable watch automatically when live is enabled.
  options.live && (options.watch = true);

  var app = require('./lib/chains.js')();

  app.use(function(options, next) {

    // clear cache?
    if (options.clean) {
      time(function() {
        fis.cache.clean('compile');
      });
    } else if (env.configPath) {
      // fis-conf 失效？
      var cache = fis.cache(env.configPath, 'conf');
      if(!cache.revert()){
        cache.save();
        time(function() {
          fis.cache.clean('compile');
        });
      }
    }

    next(null, options);
  });

  // watch it?
  options.watch && app.use(watch);
  //清除dest目录
  app.use(function(options,next){
    //clear dest/*
    //if(options.clear && options.dest !== 'preview'){
    if(options.clear){
      fis.log.info('clear dir %s',dest);
      //为什么不直接用_.del(destPath),是因为dest=preview时,部署的www文件夹只读，不能删除，否则报错，而_.del最后会删除这个文件夹
      var destPath = _.realpath(dest);
      destPath && fs.readdirSync(destPath).forEach(function(name) {
        if (name != '.' && name != '..') {
          //server.log 这个文件排除掉 
           _.del(destPath + '/' + name, null,['server.log']);
        }
      });
    }
    next(null, options);
  });
  app.use(release);

  // 处理 livereload 脚本
  app.use(livereload.handleReloadComment);

  // deliver
  app.use(function(info, next) {
    fis.log.debug('deploy start');
    deploy(info, function(error) {
      fis.log.debug('deploy end');
      next(error, info);
    });
  });

  options.live && app.use(livereload.checkReload);

  // run it.
  app.run(options);
};

function validate(argv) {
  if (argv._.length > 2) {
    fis.log.error('Unregconized `%s`, please run `%s release --help`', argv._.slice(2).join(' '), fis.cli.name);
  }

  var allowed = ['_', 'dest', 'd', 'lint', 'l', 'watch', 'w', 'live', 'L', 'clean', 'c', 'unique', 'u', 'verbose', 'color', 'root', 'r', 'f', 'file', 'child-flag'];

  Object.keys(argv).forEach(function(k) {
    if (!~allowed.indexOf(k)) {
      fis.log.error('The option `%s` is unregconized, please run `%s release --help`', k, fis.cli.name);
    }
  });
}
