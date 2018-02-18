var userLat = localStorage.userLat;
var userLong = localStorage.userLong;
var userWeather = localStorage.userWeather;
var unit = localStorage.unit;
var darkSkyAPIKey = "5b8fdae1aee24bf1c62acede923106e9";
var darkSkyURL = "https://api.darksky.net/forecast/"+darkSkyAPIKey+"/";

var myApp = new Framework7({
	material: true
});

var mainView = myApp.addView('.view-main', {
});

Template7.registerHelper('dayOfWeek', function (date) {
    date = new Date(date);
    var days = ('الأحد الاثنين الثلاثاء الأربعاء الخميس الجمعة السبت').split(' ');
    return days[date.getDay()];
 });

 Template7.registerHelper('formatedDate', function (date) {
    date = new Date(date);
    var months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
    return months[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear();
 });
 
 Template7.registerHelper('formatedTemp', function (temperature) {
    return Math.trunc(temperature);
 });
 
 var $$ = Dom7;
 myApp.detailsTemplate = Template7.compile($$('#details-template').html());
 myApp.homeItemsTemplate = Template7.compile($$('#home-items-template').html());
 myApp.searchResultsTemplate = Template7.compile($$('#search-results-template').html());
 myApp.worldDetailsTemplate = Template7.compile($$('#world-details-template').html());
 
 $$(document).on('deviceready', function() {
    console.log("Device is ready!");
	document.addEventListener("backbutton", onBackKeyDown, false);
    getLocalWeather();
 }); 

 function getLocalWeather(){   
    if(!userLat && !userLong){ 
        cordova.plugins.diagnostic.isLocationAvailable(onLocationAvailableSuccess, onLocationAvailableError); 
    }else{
        getWeatherData(userLat, userLong);
    }
 }

 var onLocationAvailableSuccess = function(available){
    alert("Location is " + (available ? "available" : "not available"));
    if(!available){
        cordova.plugins.locationAccuracy.request(onLocationAvailableSuccess,
            onLocationAccuracyRequestFailure,
            cordova.plugins.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY);
    }else{
        navigator.geolocation.getCurrentPosition(onGetPositionSuccess, onGetPositionError);
    }
 };
 
 var onLocationAvailableError = function(error){
    console.log("The following error occurred: "+error);
    alert("لم نتمكن من إحضار موقعك، يرجى التحقق من صلاحيات المكان");   
 };
 
 function onLocationAccuracyRequestSuccess(success){
    navigator.geolocation.getCurrentPosition(onGetPositionSuccess, onGetPositionError);
 };

 function onLocationAccuracyRequestFailure(error){   
    if(error.code !== cordova.plugins.locationAccuracy.ERROR_USER_DISAGREED){
        if(window.confirm("فشل في عملية تحديد المكان بشكل تلقائي، هل ترغب بالانتقال إلى إعدادات النظام لمنح الصلاحية بشكل يدوي؟")){
            cordova.plugins.diagnostic.switchToLocationSettings();
        }
    } else{
        alert("لم نتمكن من إحضار موقعك، يرجى التحقق من صلاحيات المكان");       
    }   
 };

 var onGetPositionSuccess = function(position) {   
    alert('Latitude: '          + position.coords.latitude          + '\n' +
          'Longitude: '         + position.coords.longitude         + '\n');
    localStorage.userLat = position.coords.latitude;
    localStorage.userLong = position.coords.longitude; 
    userLat = localStorage.userLat;
    userLong = localStorage.userLong; 
    if (mainView.activePage.name === "index") {
    	getWeatherData(userLat, userLong);
	} else if (mainView.activePage.name === "settings") {
    	$$("#lat").val(userLat);
    	$$("#long").val(userLong);
	}        
 };

 function onGetPositionError(error) {
    console.log('code: ' + error.code + '\n' +
    'message: ' + error.message + '\n');
    alert("لم نتمكن من إحضار موقعك، يرجى التحقق من صلاحيات المكان");   
 };
 
 function getWeatherData(lat, long){
    myApp.showPreloader("جار الحصول على معلومات الطقس");
    var requestURL = darkSkyURL + lat + "," + long + "?exclude=hourly,minutely,alerts,flags&lang=ar&units=" + (unit === 'c' ? "si" : "us");
    $$.getJSON(requestURL,
        function(forecast) {
            myApp.hidePreloader();
            localStorage.userWeather = JSON.stringify(forecast);
            userWeather = forecast;
            var pageContent = myApp.detailsTemplate(userWeather);
            mainView.router.load({
            content: pageContent,
            animatePages: false
            });
        },
        function(error){       
            myApp.hidePreloader();
            alert("لم نتمكن من الوصول إلى الشبكة"); 
            userWeather = localStorage.userWeather;
            if(!userWeather){
                console.log("!userWeather");
            }else{
                userWeather = JSON.parse(userWeather);
            }
            var pageContent = myApp.detailsTemplate(userWeather);
            mainView.router.load({
                content: pageContent,
                animatePages: false
            });             
    });
 
 }

myApp.onPageAfterAnimation('index', function (page) {
    getLocalWeather();
});

$$(document).on('click', '#refresh', function(){
    getLocalWeather();
});
 

var searchTimeout;
myApp.searchLocation = function (search) {
    if (search.trim() === '') {
        $$('.popup .search-results').html('');
        return;
    }
    var query = encodeURIComponent('select * from geo.places where text="' + search + '"');
    var q = 'http://query.yahooapis.com/v1/public/yql?q=' + query + '&format=json';
    
    if (searchTimeout) clearTimeout(searchTimeout);
    $$('.popup .preloader').show();
    searchTimeout = setTimeout(function () {
        $$.get(q, function (results) {
            var html = '';
            results = JSON.parse(results);
            $$('.popup .preloader').hide();
            if (results.query.count > 0) {
                var places = results.query.results.place;
                html = myApp.searchResultsTemplate(places);
            }
            $$('.popup .search-results').html(html);
        });
    }, 300);
};

$$('.popup .search-results').on('click', 'li', function () {
    var li = $$(this);
    var woeid = li.attr('data-woeid');
    var city = li.attr('data-city');
    var country = li.attr('data-country');
    var places = [];
    if (localStorage.w7Places) places = JSON.parse(localStorage.w7Places);
    places.push({
        woeid: li.attr('data-woeid'),
        city: li.attr('data-city'),
        country: li.attr('data-country')
    });
    localStorage.w7Places = JSON.stringify(places);
    myApp.updateWeatherData(function () {
        myApp.buildWeatherHTML();
    }); 
});


var mySearchbar = myApp.searchbar('.searchbar', {
    customSearch: true,
    onDisable: function (s) {
        $$('.popup input[type="search"]')[0].blur();
        myApp.closeModal('.popup');
    },
    onSearch: function (s, q) {
        myApp.searchLocation(s.query);
    },
    onClear: function (s) {
        $$('.popup .search-results').html('');
    }     
});

$$('.popup').on('open', function () {
    mySearchbar.enable();
});

$$('.popup').on('opened', function () {
    $$('.popup input[type="search"]')[0].focus();
}); 

myApp.buildWeatherHTML = function () {
    var weatherData = localStorage.w7Data;
    var data = undefined;
    if (weatherData) {
        $$('.places-list ul').html('');
        weatherData = JSON.parse(weatherData);
        data = weatherData;
    }
    var html = myApp.homeItemsTemplate(data);
    $$('.places-list ul').html(html);
 };
 

myApp.onPageAfterAnimation('world', function (page) {
    myApp.buildWeatherHTML();
    myApp.updateWeatherData(function () {
        myApp.buildWeatherHTML();
    });
 
});

myApp.updateWeatherData = function (callback) {
    var woeids = [];
    if (!localStorage.w7Places) return;
    var places = JSON.parse(localStorage.w7Places);
    if (places.length === 0) {
        localStorage.w7Data = JSON.stringify([]);
        return;
    }
    if (!navigator.onLine) {
        myApp.alert('أنت بحاجة إلى الاتصال بالشبكة لتحديث معلومات الطقس');
    }
    for (var i = 0; i < places.length; i++) {
        woeids.push(places[i].woeid);
    }
    var query = encodeURIComponent('select * from weather.forecast where woeid in (' + JSON.stringify(woeids).replace('[', '').replace(']', '') + ') and u="' + unit + '"');
    var q = 'http://query.yahooapis.com/v1/public/yql?q=' + query + '&format=json';
    myApp.showIndicator();
    $$.get(q, function (data) {
        myApp.hideIndicator();
        var weatherData = [];
        data = JSON.parse(data);
        if (!data.query || !data.query.results) return;
        var places = data.query.results.channel;
        var place;
        if ($$.isArray(places)) {
            for (var i = 0; i < places.length; i++) {
                place = places[i];
                weatherData.push({
                    city: place.location.city,
                    country: place.location.country,
                    region: place.location.region,
                    condition: place.item.condition,   
                    forecast: place.item.forecast,
                    woeid: woeids[i]
                });
                 
            } 
        }
        else{
            place = places;
            weatherData.push({
                city: place.location.city,
                country: place.location.country,
                region: place.location.region,
                condition: place.item.condition,
                forecast: place.item.forecast,
                woeid: woeids[0]
            });
        }
        localStorage.w7Data = JSON.stringify(weatherData);
        if (callback) callback();
    });  
};

// Build details page
$$(document).on('click', 'a.item-link', function (e) {
    var woeid = $$(this).attr('data-woeid');
    var item;
   var weatherData = JSON.parse(localStorage.w7Data);
   for (var i = 0; i < weatherData.length; i++) {
       if (weatherData[i].woeid === woeid) item = weatherData[i];
   }
   var pageContent = myApp.worldDetailsTemplate(item);
   mainView.loadContent(pageContent);   
});


// Delete place
$$(document).on('delete', '.swipeout', function () {
    var woeid = $$(this).attr('data-woeid');
    if (!localStorage.w7Places) return;
    var places = JSON.parse(localStorage.w7Places);
    for (var i = 0; i < places.length; i++) {
        if (places[i].woeid === woeid) places.splice(i, 1);
    }
    localStorage.w7Places = JSON.stringify(places);
    if (!localStorage.w7Data) return;
    var data = JSON.parse(localStorage.w7Data);
    for (i = 0; i < data.length; i++) {
        if (data[i].woeid === woeid) data.splice(i, 1);
    }
    localStorage.w7Data = JSON.stringify(data);
    if (data.length === 0) myApp.buildWeatherHTML();
});

var pickerUnit = myApp.picker({
    input: '#picker-unit',
    toolbarCloseText: "تم",
    cols: [
        {
            textAlign: 'center',
            values: ['Fahrenheit', 'Celsius']
        }
    ],
    onOpen: function (picker) {       
        currentUnit = 'Celsius';
        if(unit === 'f'){
            var currentUnit = 'Fahrenheit';
        }
        picker.setValue([currentUnit]);
    },
    onChange: function (picker, values, displayValues) {       
        $$('#picker-unit').html(values[0]);
    },
    onClose:  function (picker){               
        if(picker.value[0] === 'Celsius'){
            localStorage.unit = unit = 'c';
        }else{
            localStorage.unit = unit = 'f';
        }
    }
});

$$(document).on('click', '#picker-unit', function(){
    pickerUnit.open();
 });
 
myApp.onPageAfterAnimation('settings', function(){
    $$('#lat').val(localStorage.userLat);
    $$('#long').val(localStorage.userLong);
});

$$(document).on('click', '#save-loc', function(){
    userLat = $$('#lat').val();
    localStorage.userLat = userLat;
    userLong = $$('#long').val();
    localStorage.userLong = userLong; 
 });
 
 $$(document).on('click', '#update-loc', function(){
    cordova.plugins.diagnostic.isLocationAvailable(onLocationAvailableSuccess, onLocationAvailableError);
 });

function onBackKeyDown() {
	var page = mainView.activePage.name;		
	if (page === "location") {	
		navigator.app.exitApp();	
	} else {
		mainView.router.back();
	}
}