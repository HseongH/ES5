require('bootstrap');

var pageScript = {
	index: require('./js/dashboard'),
	server: require('./js/server'),
	database: require('./js/database')
};
var page = location.pathname.slice(1).replace(/\.html/gi, '');

pageScript[page || 'index'].init();
