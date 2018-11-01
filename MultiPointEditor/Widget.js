define(
	[
    'dojo/_base/declare', 
    "dojo/_base/lang",
    'jimu/BaseWidget',
    "esri/layers/FeatureLayer",
		"esri/map",
    "esri/toolbars/draw",
    "esri/toolbars/edit"
  ],
  function(declare, lang, BaseWidget, FeatureLayer, Map, Draw, Edit) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-multipointeditor',

      //this property is set by the framework when widget is loaded.
      name: 'MultiPointEditor',

      multipoints: null,
      //methods to communication with app container:

      // postCreate: function() {
      //   this.inherited(arguments);
      //   console.log('postCreate');
      // },

      startup: function() {
        this.inherited(arguments);
        console.log(this.map);
        this.multipoint = new FeatureLayer(
          "https://services1.arcgis.com/vY6WuhLW0HkFe6Fl/arcgis/rest/services/Multipoints_Editing/FeatureServer/0"
        );

        this.makeEditable(this.multipoint);
        console.log('startup');
      },

      // onOpen: function(){
      //   console.log('onOpen');
      // },

      // onClose: function(){
      //   console.log('onClose');
      // },

      // onMinimize: function(){
      //   console.log('onMinimize');
      // },

      // onMaximize: function(){
      //   console.log('onMaximize');
      // },

      // onSignIn: function(credential){
      //   /* jshint unused:false*/
      //   console.log('onSignIn');
      // },

      // onSignOut: function(){
      //   console.log('onSignOut');
      // }

      // onPositionChange: function(){
      //   console.log('onPositionChange');
      // },

      // resize: function(){
      //   console.log('resize');
      // }


      makeEditable: function (featureLayer){
        featureLayer.on("click", lang.hitch(this, function(){
          console.log("Graphic Clicked");
        }));
      }


      //methods to communication between widgets:

    });
  });