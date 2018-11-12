define(
	[
    'dojo/_base/declare', 
    "dojo/_base/lang",
    "dojo/on",
    "dojo/_base/Color",
    'dojo/_base/html',
    'dojo/_base/array',
    'dojo/Deferred',
    'dojo/promise/all',
    'dijit/form/Button',
    'dijit/Fieldset',
    'dijit/form/RadioButton',
    "dijit/_WidgetsInTemplateMixin",
    'jimu/BaseWidget',
    'jimu/MapManager',
    'jimu/PanelManager',
    'jimu/LayerInfos/LayerInfos',
    'jimu/dijit/LoadingShelter',
    'jimu/dijit/Popup',
    'jimu/utils',
    'jimu/portalUrlUtils',
    'jimu/SelectionManager',
    'jimu/Role',
    "esri/layers/FeatureLayer",
    "esri/graphic",
    "esri/map",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/tasks/query",
    "esri/toolbars/draw",
    "esri/toolbars/edit",
    "esri/dijit/editing/TemplatePicker",
    "./utils",
    "./lib/EditPopup",
    "./lib/MultipointEditor"
  ],
  function(
    declare, lang, on, dojoColor, html, array, Deferred, all, 
    Button, Fieldset, RadioButton, _WidgetsInTemplateMixin,
    BaseWidget, MapManager, PanelManager, 
    LayerInfos, LoadingShelter, JimuPopup,
    jimuUtils, portalUrlUtils,SelectionManager, Role, 
    FeatureLayer, Graphic, Map, SimpleMarkerSymbol, Query, Draw, Edit, TemplatePicker, editUtils, EditPopup,
    MultipointEditor
    ) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget, _WidgetsInTemplateMixin], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-multipointeditor',

      //this property is set by the framework when widget is loaded.
      name: 'MultiPointEditor',
      editToolbar: null,
      drawToolbar: null,

      positionInfo: {
        TOP: "18px",
        TOP_WITH_TEMPLATE_FILTER: "115px",
        TOP_WITH_EDIT_RG: "53px",
        TOP_WITH_TEMPLATE_FILTER_AND_EDIT_RG: "155px"
      },
      _editorMapClickHandlers: null,
      _layerObjectsParaForTempaltePicker: null,
      _configEditor: null,
      _releaseEventArrayAfterActive: null,
      _releaseEventArrayAfterClose: null,
      _canCreateLayersAreAllInvisibleFlag: null,
      _layerInfoParamArrayUseForRervertRenderre: null,
      _createOverDef : null,
      _tableInfoParamDef : null,
      _hasEditPrivilege : null,
      _panelManager : null,
      _changedTemplatesOfTemplatePicker : null,
      _releaseEventArrayAfterEditingRelatedGraphic : null,
      _isInEditingRelatedGraphicSession : null,
      _needToRequeryFeatureArray : null,
      _jimuLayerInfos : null,
      _isEditableLayerStore : null,
      _layerInfosInConfig : null,

      multipoints: null,
      _editableLayersIds: [],
      selectedGraphic: null,
      highlightSymbol : new SimpleMarkerSymbol().setColor(new dojoColor([255,0,0])),
      layerClickEvents: [],
      currentAddEvent: null,
      multipointEditor: null,
      //multipointEditorVM:null,

      editPopup: null,
      //methods to communication with app container:

      // postCreate: function() {
      //   this.inherited(arguments);
      //   console.log('postCreate');
      // },

      startup: function() {
        this.inherited(arguments);

        //Configuring the popup that will be used for editing
        this.editPopup = new EditPopup(
          null, 
          html.create("div", {
            "class":"jimu-widget-edit-infoWindow"
          },
          null,
          this.map.root
        ));
        

        //this.editToolbar = new Edit(this.map, null);
        this.drawToolbar = new Draw(this.map);
        this.multipointEditor = new MultipointEditor({"map": this.map}, this.multipointEditWidget);
        this.multipointEditor.startup();
        this.loading = new LoadingShelter({
          hidden: true
        });
        this.loading.placeAt(this.domNode);

        this._init();

        this._asyncPrepareDataAtStart().then(lang.hitch(this, function() {
          var timeoutValue;
          if(this.appConfig.theme.name === "BoxTheme") {
            timeoutValue = 1050;
            this.loading.show();
          } else {
            timeoutValue = 1;
          }
          setTimeout(lang.hitch(this, function() {
            if(!this.loading.hidden) {
              this.loading.hide();
            }
            this.widgetManager.activateWidget(this);
            //this._createEditor();
          }), timeoutValue);

          //prepare tableInfosParam data for relatedRecordsEditor
          // this._getTableInfosParam().then(lang.hitch(this, function(tableInfosParam) {
          //   this.tableInfosParam = tableInfosParam;
          //   this.tableInfosParamClone = this._cloneLayerOrTableInfosParam(this.tableInfosParam);
          //   this._tableInfoParamDef.resolve();
          // }));
          this.loading.hide();
        }), lang.hitch(this, function() {
          this.loading.hide();
        }));

        //var settings = this._getSettingsParam();
        
        this.disableWebMapPopup();

        console.log('startup');
      },

      activateDraw: function(featureLayer){
        this.drawToolbar.on("draw-complete", lang.hitch(this, this.addDrawingGraphicToMap, featureLayer));
        this.drawToolbar.activate(Draw.MULTI_POINT, null);
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


      addDrawingGraphicToMap: function (layer, evt) {
        console.log("Adding drawing ...");
        var symbol;
        this.drawToolbar.deactivate();
        //map.showZoomSlider();
        switch (evt.geometry.type) {
          case "point":
          case "multipoint":
            symbol = new SimpleMarkerSymbol();
            break;
          case "polyline":
            symbol = new SimpleLineSymbol();
            break;
          default:
            symbol = new SimpleFillSymbol();
            break;
        }
        var graphic = new Graphic(evt.geometry, symbol, {});
        layer.applyEdits(
          [graphic], 
          null,  
          null,
          function(){
            console.log("Feature Added!");
          },
          function(err){
            console.log("Failed to add feature: ", err.details[0]);
          });
        //map.graphics.add(graphic);
      },

      setEditButtonDisabled: function(disabled){
        // this.radioMoveVertices.disabled = disabled;
        // this.radioAddVertices.disabled = disabled;
        // this.radioRemoveVertices.disabled = disabled;
        // this.radioInsert.disabled = disabled;
        // this.btnDeleteFeature.set("disabled", disabled);
      },

      activateEditing: function(){
        this.activateEditing();
      },

      deactivateEditing: function(){
        // this.setEditButtonDisabled(true);
        // //Remove any layer event associated with adding point
        // this.removeAddEvent();

        // //Deactivate the editing toolbar
        // this.editToolbar.deactivate();
        // this.activateLayerClickEvents();
        // this.radioNoEdit.check = true;
      },

      activateLayerClickEvents: function(){
        console.log("Resuming layer click event");
        for(var i=0; i < this.layerClickEvents.length; i++){
          this.layerClickEvents[i].resume();
        }
      },

      pauseLayerClickEvents: function(){
        console.log("Pausing layer click event");
        for(var i=0; i < this.layerClickEvents.length; i++){
          this.layerClickEvents[i].pause();
        }
      },

      // choseEditingEvent: function(){

      //   //console.log("Pausing selection events");
      //   this.pauseLayerClickEvents();

      //   this.removeAddEvent();

      //   if (this.radioMoveVertices.checked){
      //       this.editToolbar.activate(Edit.EDIT_VERTICES , this.selectedGraphic, {allowDeleteVertices:false});
      //   }
      //   else if (this.radioAddVertices.checked){
      //       //var graphicLayer = this.selectedGraphic.getLayer();
      //       this.currentAddEvent = this.map.on("click", lang.hitch(this, function(evt){
      //           console.log("Pushing point: ", evt.mapPoint);
      //           this.selectedGraphic.geometry.points.push(
      //               [evt.mapPoint.x, evt.mapPoint.y]
      //           );
      //           this.selectedGraphic.getLayer().applyEdits([this.selectedGraphic], null, null);
      //       }))
      //   }
      //   else if (this.radioRemoveVertices.checked){
      //     console.log("Activating Remove ...");
      //     this.editToolbar.activate(Edit.EDIT_VERTICES , this.selectedGraphic, {allowDeleteVertices:true});
      //   }
      // },
    
      removeAddEvent: function(){
        console.log("Removing Add Event");
        if (this.currentAddEvent != null){
          this.currentAddEvent.remove();
          this.currentAddEvent = null;
        }
      },

      // makeLayersSelectable: function(){
      //   for (var i=0; i < this._editableLayersIds.length; i++){
      //     var layerId = this._editableLayersIds[i];
      //     var featureLayer = this.map.getLayer(layerId);
      //     this.makeLayerSelectable(featureLayer);
      //   }
      // },

      // makeLayerSelectable(featureLayer){
      //   //console.log("Pushing click event");
      //   this.layerClickEvents.push(
      //     //featureLayer.on("click", lang.hitch(this, function(evt){
      //     on.pausable(featureLayer, "click", lang.hitch(this, function(evt){
      //     console.log("Layer Click ...");
      //     //if (this.selectedGraphic == null){
      //       featureLayer.setSelectionSymbol(this.highlightSymbol);
      //       var query = new Query();
      //       query.where = featureLayer.objectIdField	+ "=" + evt.graphic.attributes[featureLayer.objectIdField];
      //       featureLayer.selectFeatures(query, null, lang.hitch(this, 
      //       function(evt){
      //           this.selectedGraphic = evt[0];
      //           this.setEditButtonDisabled(false);
      //       }),
      //       function(err){
      //           console.log("Feature Selection Failed ...");
      //           this.setEditButtonDisabled(true);
      //       })
      //   //  }
      //   })));
      // },

      activateMovePoint: function(){
          for (var i=0; i < this._editableLayersIds.length; i++){
            var layerId = this._editableLayersIds[i];
            var layer = this.map.getLayer(layerId);
            this.makeMovable(layer);
          }
      },

      makeMovable: function (featureLayer){
        featureLayer.on("click", lang.hitch(this, function(evt){
          console.log("Graphic Clicked");
          //this.editToolbar.activate(Edit.EDIT_VERTICES , evt.graphic, {allowDeleteVertices:true});
        }));
      },

      _init: function() {
        this._mapInfoStorage = {
          resetInfoWindow: null,
          snappingTolerance: null,
          editorATIonLayerSelectionChange: null
        };
        this._editorMapClickHandlers = [];
        this._layerObjectsParaForTempaltePicker = [];
        this._configEditor = lang.clone(this.config.editor);
        this._releaseEventArrayAfterActive = [];
        this._releaseEventArrayAfterClose = [];
        this._canCreateLayersAreAllInvisibleFlag = false;
        this._layerInfoParamArrayUseForRervertRenderre = [];
        this._createOverDef = new Deferred();
        this._tableInfoParamDef = new Deferred();
        this._hasEditPrivilege = true;
        this._panelManager = PanelManager.getInstance();
        this._changedTemplatesOfTemplatePicker = [];
        this._releaseEventArrayAfterEditingRelatedGraphic = [];
        this._isInEditingRelatedGraphicSession = false;
        this._needToRequeryFeatureArray = [];
        this._jimuLayerInfos = LayerInfos.getInstanceSync(this.map, this.map.itemInfo);
        this._isEditableLayerStore = {};
        this._layerInfosInConfig = this._getLayerInfosInConfig();
      },

      _asyncPrepareDataAtStart: function() {
        var isEditableDefs = [];
        array.forEach(this._layerInfosInConfig, function(layerInfoInConfig) {
          var layerId = layerInfoInConfig.featureLayer.id;
          //var layerObject = this.map.getLayer(layerId);
          var jimuLayerInfo = this._jimuLayerInfos.getLayerInfoByTopLayerId(layerId);

          if(jimuLayerInfo) {
            var isEditableDef = jimuLayerInfo.isEditable();
            isEditableDef._layerInfoInConfig = layerInfoInConfig;
            isEditableDefs.push(isEditableDef);
          }
        }, this);

        return all(isEditableDefs).then(lang.hitch(this, function(isEditables) {
          array.forEach(isEditables, lang.hitch(this, function(isEditable, index) {
            var layerInfoInfoInConfig = isEditableDefs[index]._layerInfoInConfig;
            var layerId = layerInfoInfoInConfig &&
                layerInfoInfoInConfig.featureLayer &&
                layerInfoInfoInConfig.featureLayer.id;
            this._isEditableLayerStore[layerId] = isEditable;
            this._editableLayersIds.push(layerId);
          }), this);

          var settings = this._getSettingsParam();
          //this.makeLayersSelectable();
          console.log("Making layer selectable - Main Widget");
          this.multipointEditor.makeLayersSelectable(this._editableLayersIds);
          //For earch layer associate them with a double click event
          return;
        }));
      },

      _getLayerInfosInConfig: function() {
        var layerInfos;
        if(!this._configEditor.layerInfos) {
          // configured in setting page and no layers checked.
          layerInfos = [];
        } else if(this._configEditor.layerInfos.length > 0)  {
          // configured and has been checked.
          layerInfos = this._converConfiguredLayerInfos(this._configEditor.layerInfos);
        } else {
          // has not been configured.
          layerInfos = this._getDefaultLayerInfos();
        }
        return layerInfos;
      },

      _converConfiguredLayerInfos: function(layerInfos) {
        array.forEach(layerInfos, function(layerInfo) {
          // convert layerInfos to compatible with old version
          if(!layerInfo.featureLayer.id && layerInfo.featureLayer.url) {
            var layerObject = getLayerObjectFromMapByUrl(this.map, layerInfo.featureLayer.url);
            if(layerObject) {
              layerInfo.featureLayer.id = layerObject.id;
            }
          }

          // convert fieldInfos
          var newFieldInfos = [];
          var webmapFieldInfos =
            editUtils.getFieldInfosFromWebmap(layerInfo.featureLayer.id, this._jimuLayerInfos);
          array.forEach(layerInfo.fieldInfos, function(fieldInfo) {
            // compitible with old version of config,
            // to decide which field will display in the inspector.
            var webmapFieldInfo = getFieldInfoFromWebmapFieldInfos(webmapFieldInfos, fieldInfo);
            if(fieldInfo.visible === undefined) {
              // compatible with old version fieldInfo that does not defined
              // the visible attribute.
              if(webmapFieldInfo) {
                if( webmapFieldInfo.isEditable ||
                    webmapFieldInfo.isEditableSettingInWebmap ||
                    webmapFieldInfo.visible) {
                  newFieldInfos.push(webmapFieldInfo);
                }
              } else {
                newFieldInfos.push(fieldInfo);
              }
            } else {
              // the fieldInfo has defined the visble attribute(since online4.1).
              if(fieldInfo.visible || fieldInfo.isEditable) {
                //push to newFieldInfos
                if(webmapFieldInfo) {
                  newFieldInfos.push(webmapFieldInfo);
                } else {
                  newFieldInfos.push(fieldInfo);
                }
              }
            }
          }, this);

          if(newFieldInfos.length !== 0) {
            layerInfo.fieldInfos = newFieldInfos;
          }
        }, this);
        return layerInfos;

        function getFieldInfoFromWebmapFieldInfos(webmapFieldInfos, fieldInfo) {
          var resultFieldInfo = null;
          if(webmapFieldInfos) {
            for(var i = 0; i < webmapFieldInfos.length; i++) {
              if(fieldInfo.fieldName === webmapFieldInfos[i].fieldName) {
                webmapFieldInfos[i].label = fieldInfo.label;
                webmapFieldInfos[i].isEditableSettingInWebmap = webmapFieldInfos[i].isEditable;
                webmapFieldInfos[i].isEditable = fieldInfo.isEditable;
                resultFieldInfo = webmapFieldInfos[i];
                // resultFieldInfo.label = fieldInfo.label;
                // resultFieldInfo.isEditableSettingInWebmap = webmapFieldInfos[i].isEditable;
                // resultFieldInfo.isEditable = fieldInfo.isEditable;
                break;
              }
            }
          }
          return resultFieldInfo;
        }

        function getLayerObjectFromMapByUrl(map, layerUrl) {
          var resultLayerObject = null;
          for(var i = 0; i < map.graphicsLayerIds.length; i++) {
            var layerObject = map.getLayer(map.graphicsLayerIds[i]);
            if(layerObject &&
               layerObject.url &&
               (portalUrlUtils.removeProtocol(layerObject.url.toLowerCase()) ===
                portalUrlUtils.removeProtocol(layerUrl.toLowerCase()))) {
              resultLayerObject = layerObject;
              break;
            }
          }
          return resultLayerObject;
        }
      },

      _getLayerInfosParam: function() {
        var layerInfos = this._layerInfosInConfig;
        var resultLayerInfosParam = [];

        //according to conditions to filter
        array.forEach(layerInfos, function(layerInfo) {
          var layerId = layerInfo.featureLayer.id;
          var layerObject = this.map.getLayer(layerId);
          if(layerObject &&
             layerObject.visible &&
             //layerObject.isEditable &&
             //layerObject.isEditable()) {
             //jimuLayerInfo &&
             //jimuLayerInfo.isEditable(this._user)
             this._isEditableLayerStore[layerId]) {
            layerInfo.featureLayer = layerObject;
            resultLayerInfosParam.push(layerInfo);
          }

          // update this._canCreateLayersAreAllInvisibleFlag
          if(!this._canCreateLayersAreAllInvisibleFlag &&
             layerObject &&
             //layerObject.isEditable &&
             //layerObject.isEditable() &&
             //jimuLayerInfo &&
             //jimuLayerInfo.isEditable(this._user) &&
             this._isEditableLayerStore[layerId] &&
             layerObject.getEditCapabilities &&
             layerObject.getEditCapabilities().canCreate &&
             !layerObject.visible) {
            this._canCreateLayersAreAllInvisibleFlag = true;
          }
        }, this);

        this.layerInfosParam = resultLayerInfosParam;
        this.layerInfosParamClone = this._cloneLayerOrTableInfosParam(this.layerInfosParam);
        return resultLayerInfosParam;
      },
      //methods to communication between widgets:

      /***************************************
       * Methods for data handle.
       ***************************************/

      _cloneLayerOrTableInfosParam: function(layerOrTableInfosParam) {
        var layerOrTableInfosParamClone = [];
        array.forEach(layerOrTableInfosParam, function(layerOrTableInfo) {
          var featureLayerBK = layerOrTableInfo.featureLayer;
          layerOrTableInfo.featureLayer = null;
          var newLayerOrTableInfo = lang.clone(layerOrTableInfo);
          newLayerOrTableInfo.featureLayer = featureLayerBK;
          layerOrTableInfo.featureLayer = featureLayerBK;
          layerOrTableInfosParamClone.push(newLayerOrTableInfo);
        }, this);
        return layerOrTableInfosParamClone;
      },

      _isTemporaryFeatureForAddOnlyMode: function(feature) {
        var layer = feature.getLayer();
        var layerInfo = this._jimuLayerInfos.getLayerOrTableInfoById(layer && layer.id);
        var isTemporaryFeature = false;
        //if feature service is 'add feature only', currentFeature is a local temporary graphic,
        //edit will add it to client first, so widget does not need to show related tables or re-query.
        //in this situation, the featureLayer id "map_graphics".
        if(layerInfo) {
          isTemporaryFeature = false;
        } else {
          isTemporaryFeature = true;
        }
      },

      _getTemplatePicker: function(layerInfos) {
        this._layerObjectsParaForTempaltePicker = [];

        array.forEach(layerInfos, function(layerInfo) {
          if(layerInfo.featureLayer &&
            layerInfo.featureLayer.getEditCapabilities &&
            layerInfo.featureLayer.getEditCapabilities().canCreate) {
            this._layerObjectsParaForTempaltePicker.push(layerInfo.featureLayer);
          }
        }, this);

        var bottomStyle = this._configEditor.toolbarVisible ? "" : "bottom: 0px";
        var topStyle = this._configEditor.useFilterEdit ?
                       "top: " + this.positionInfo.TOP_WITH_TEMPLATE_FILTER :
                       "top: " + this.positionInfo.TOP;
        var templatePicker = new TemplatePicker({
          featureLayers: this._layerObjectsParaForTempaltePicker,
          grouping: true,
          rows: "auto",
          columns: "auto",
          style: bottomStyle + ";" + topStyle
        }, html.create("div", {}, this.templatePickerDiv));

        templatePicker.on("selection-change", lang.hitch(this, function() {
          this.drawToolbar.deactivate();
          this.multipointEditor.setEditControlsDisabled(true);
          var selected = templatePicker.getSelected();
          if (selected) {
            var featureLayer = selected.featureLayer;
            var type = selected.type;
            var template = selected.template; 
            this.activateDraw(featureLayer);
            console.log("Selected Layer: ", featureLayer.id);      
          }
        }));

        templatePicker.startup();
        return templatePicker;
      },

      _getSettingsParam: function() {
        var settings = {
          map: this.map,
        };

        for (var attr in this._configEditor) {
          settings[attr] = this._configEditor[attr];
        }
        settings.layerInfos = this._getLayerInfosParam();
        settings.templatePicker = this._getTemplatePicker(settings.layerInfos);
        // set popup tolerance
        if(this._configEditor.popupTolerance !== undefined) {
          settings.singleSelectionTolerance = this._configEditor.popupTolerance;
        }

        return settings;
      },


      disableWebMapPopup: function() {
        var mapManager = MapManager.getInstance();
        mapManager.disableWebMapPopup();
        // hide map's infoWindow
        this.map.infoWindow.hide();
        //instead of map's infowindow by editPopup
        this.map.setInfoWindow(this.editPopup);
        // this._enableMapClickHandler();

        // instead of Mapmanager.resetInfoWindow by self resetInfoWindow
        // if (this._mapInfoStorage.resetInfoWindow === null) {
        //   this._mapInfoStorage.resetInfoWindow = mapManager.resetInfoWindow;
        //   this.own(on(this.map.infoWindow, "show", lang.hitch(this, function() {
        //     if (window.appInfo.isRunInMobile) {
        //       this.map.infoWindow.maximize();
        //       setTimeout(lang.hitch(this, function() {
        //         // cannot add class 'esriPopupMaximized' while calling maximize() immediately after call show().
        //         html.addClass(this.editPopup.domNode, 'esriPopupMaximized');
        //       }), 1);
        //     }
        //   })));
        // }
        // mapManager.resetInfoWindow = lang.hitch(this, function() {});

        // // backup map snappingTolerance and reset it.
        // if(this.map.snappingManager && this._configEditor.snappingTolerance !== undefined) {
        //   this._mapInfoStorage.snappingTolerance = this.map.snappingManager.tolerance;
        //   // default value is 15 pixels, compatible with old version app.
        //   this.map.snappingManager.tolerance = this._configEditor.snappingTolerance;
        // }
      },

    });
  });