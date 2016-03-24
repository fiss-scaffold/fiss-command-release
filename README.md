# fiss-command-release
fis-command-release的修改版，减轻命令行输入的负担，使得命令行的参数都可以在fis-conf.js里面可配置。如果命令行输入了参数，
则使用命令行传入的参数，如果没有，读取fis-conf.js里面的设置的参数。

##fis-conf.js配置方法
```js
//发布路径设置
fis.media('prod')
	.set('release',{
	    'dir':'output',//release的dest路径，对应命令行的-d/--dest参数
	    /*'watch':true,//对应命令行的-w参数
	    'live':true,*/ //对应命令行的-L参数
	    'clean':false, //对应命令行的-c参数
	    /*'lint':true,*///对应命令行的-l参数
	    //每次release的时候是否把dest目录清空，
    	    //注意，如果启动watch/live时，需要把clean设置为true，因为默认只是增量release，而每次清空目录，每次只会重新构建变动的文件,当clean为true时，不会判断缓存，全量进行release
	    'clear':true 
	});


```

使用方法
```bash
#后面不需要带-d -w -L -l -c 等参数
fiss release prod

```

---
# 下面为原版fis-command-release的reademe内容
## Usage

     Usage: fis release [media name]

     Options:

       -d, --dest <names>     release output destination
       -w, --watch            monitor the changes of project
       -L, --live             automatically reload your browser
       -c, --clean            clean compile cache
       -u, --unique           use unique compile caching
