/**
 * Grunt 설정 파일
 * @module Gruntfile
 */

module.exports = function (grunt) {
	'use strict';

	// Load all Grunt tasks automatically
	require('load-grunt-tasks')(grunt);

	// Load environment variables
	require('dotenv').config({ path: '.env.' + process.env.NODE_ENV });

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		/**
		 * 웹 서버 설정
		 * @type {Object}
		 */
		connect: {
			server: {
				options: {
					port: 80,
					hostname: '*',
					livereload: true,
					open: true,
					base: 'dist',
					middleware: function (connect, options, middlewares) {
						var proxy = require('grunt-middleware-proxy/lib/Utils').getProxyMiddleware();
						middlewares.unshift(proxy);

						return middlewares;
					}
				},
				proxies: ['/auth-user', '/auth-admin'].map(function (context) {
					return {
						context: context,
						host: process.env.PROXY_URL,
						port: 13131,
						https: false,
						rewriteHost: false
					};
				})
			}
		},

		/**
		 * 파일 변경 감지 설정
		 * @type {Object}
		 */
		watch: {
			scss: {
				files: ['src/**/*.scss'],
				tasks: ['sass', 'postcss'],
				options: {
					livereload: true
				}
			},
			js: {
				files: ['src/**/*.js'],
				tasks: ['browserify'],
				options: {
					livereload: true
				}
			},
			ejs: {
				files: ['src/**/*.ejs'],
				tasks: ['ejs'],
				options: {
					livereload: true
				}
			},
			configFiles: {
				files: ['Gruntfile.js', '*.config.js'],
				options: {
					reload: true
				}
			}
		},

		/**
		 * dist 폴더 정리 설정
		 * @type {Object}
		 */
		clean: {
			build: ['dist']
		},

		/**
		 * Sass 컴파일 설정
		 * @type {Object}
		 */
		sass: {
			options: {
				implementation: require('node-sass'),
				sourceMap: true,
				outputStyle: 'expanded',
				includePaths: ['node_modules']
			},
			dist: {
				files: {
					'dist/assets/style.css': ['src/styles/style.scss']
				}
			}
		},

		/**
		 * 파일 병합 설정
		 * @type {Object}
		 */
		concat: {
			css: {
				src: [
					'dist/assets/style.css',
					'node_modules/datatables.net-*/css/*.css',
					'!node_modules/datatables.net-*/css/*.min.css' // .min.css 파일 제외
				],
				dest: 'dist/assets/style.css'
			}
		},

		/**
		 * SCSS 파일 전처리를 위한 PostCSS 설정
		 * @type {Object}
		 */
		postcss: {
			options: {
				map: true,
				config: 'postcss.config.js'
			},
			dist: {
				src: 'dist/assets/style.css',
				dest: 'dist/assets/style.css'
			}
		},

		/**
		 * JavaScript 번들링 설정
		 * @type {Object}
		 */
		browserify: {
			dist: {
				files: {
					'dist/assets/index.js': ['src/index.js']
				},
				options: {
					transform: ['ejsify']
				}
			}
		},

		/**
		 * EJS 템플릿 변환 설정
		 * @type {Object}
		 */
		ejs: {
			all: {
				options: {
					env: process.env.NODE_ENV
				},
				files: [
					{
						expand: true,
						cwd: 'src/pages',
						src: ['**/*.ejs'],
						dest: 'dist/',
						ext: '.html'
					}
				]
			}
		},

		/**
		 * HTML 파일 처리 설정
		 * @type {Object}
		 */
		processhtml: {
			dist: {
				files: [
					{
						expand: true,
						cwd: 'dist/',
						src: ['**/*.html'],
						dest: 'dist/',
						ext: '.html'
					}
				]
			}
		},

		/**
		 * CSS 압축 설정
		 * @type {Object}
		 */
		cssmin: {
			main: {
				src: 'dist/assets/style.css',
				dest: 'dist/assets/style.min.css'
			}
		},

		/**
		 * JavaScript 압축 설정
		 * @type {Object}
		 */
		uglify: {
			main: {
				src: 'dist/assets/index.js',
				dest: 'dist/assets/index.min.js'
			}
		},

		/**
		 * 이미지 최적화 설정
		 * @type {Object}
		 */
		imagemin: {
			main: {
				files: [
					{
						expand: true,
						cwd: 'src/assets/images',
						src: ['**/*.{png,jpg,gif}'],
						dest: 'dist/assets/images'
					}
				]
			}
		},

		/**
		 * 폰트 파일 복사 설정
		 * @type {Object}
		 */
		copy: {
			build: {
				files: [
					{
						expand: true,
						cwd: 'src/assets/fonts',
						src: '**',
						dest: 'dist/assets/fonts'
					}
				]
			}
		},

		/**
		 * 최종 빌드 압축 설정
		 * @type {Object}
		 */
		compress: {
			main: {
				options: {
					archive: 'dist.tar.gz',
					mode: 'tgz'
				},
				files: [{ expand: true, cwd: 'dist/', src: '**' }]
			}
		}
	});

	/**
	 * 개발 서버 실행 태스크
	 * 1. Sass 컴파일
	 * 2. PostCSS 처리
	 * 3. JavaScript 번들링
	 * 4. 프록시 서버 설정
	 * 5. 개발 서버 실행
	 * 6. 파일 변경 감지
	 */
	grunt.registerTask('server', [
		'sass',
		'concat',
		'postcss',
		'browserify',
		'ejs',
		'setupProxies:server',
		'connect:server',
		'watch'
	]);

	/**
	 * 프로덕션 빌드 태스크
	 * 다음 순서로 실행:
	 * 1. dist 폴더 정리
	 * 2. HTML 파일 처리
	 * 3. SCSS 전처리
	 * 4. Sass 컴파일
	 * 5. JavaScript 번들링
	 * 6. EJS 템플릿 변환
	 * 7. 파일 병합
	 * 8. CSS 압축
	 * 9. 이미지 최적화
	 * 10. JavaScript 압축
	 * 11. 폰트 파일 복사
	 * 12. 최종 빌드 압축
	 */
	grunt.registerTask('build', [
		'clean',
		'sass',
		'postcss',
		'browserify',
		'ejs',
		'processhtml',
		'concat',
		'cssmin',
		'uglify',
		'imagemin',
		'copy',
		'compress'
	]);
};
