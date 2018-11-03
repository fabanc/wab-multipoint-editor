define(
	[
    'dojo/_base/declare', 
    "dojo/_base/lang",
    'dojo/_base/array',
    'dojo/Deferred',
    'dojo/promise/all',
    'jimu/BaseWidget',
    'jimu/MapManager',
    'jimu/PanelManager',
    'jimu/LayerInfos/LayerInfos',
    'jimu/dijit/LoadingShelter',
    'jimu/dijit/Popup',
    'jimu/utils',
    'jimu/portalUrlUtils',
    //'jimu/portalUtils',
    'jimu/SelectionManager',
    'jimu/Role',
    "esri/layers/FeatureLayer",
		"esri/map",
    "esri/toolbars/draw",
    "esri/toolbars/edit",
    "./utils",
  ],
  function(declare, lang, array, Deferred, all, BaseWidget, MapManager, PanelManager, LayerInfos, LoadingShelter, JimuPopup,
    jimuUtils, portalUrlUtils, /*portalUtils,*/ SelectionManager, Role, FeatureLayer, Map, Draw, Edit, editUtils) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-multipointeditor',

      //this property is set by the framework when widget is loaded.
      name: 'MultiPointEditor',
      editToolbar: null,


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
      //methods to communication with app container:

      // postCreate: function() {
      //   this.inherited(arguments);
      //   console.log('postCreate');
      // },

      startup: function() {
        this.inherited(arguments);
        console.log(this.map);

        this.loading = new LoadingShelter({
          hidden: true
        });
        this.loading.placeAt(this.domNode);

        var editOptions = {
            allowAddVertices: true,
            allowDeleteVertices:true
        };

        this.editToolbar = new Edit(this.map, editOptions);
  

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
        var settings = this._getSettingsParam();



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
        featureLayer.on("click", lang.hitch(this, function(evt){
          console.log("Graphic Clicked");
          this.editToolbar.activate(Edit.EDIT_VERTICES , evt.graphic);

          this.editToolbar.on("vertex-click", function(graphic, vertexInfo){
            console.log("Clicked: ", vertexInfo);
          })
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
          array.forEach(isEditables, function(isEditable, index) {
            var layerInfoInfoInConfig = isEditableDefs[index]._layerInfoInConfig;
            var layerId = layerInfoInfoInConfig &&
                layerInfoInfoInConfig.featureLayer &&
                layerInfoInfoInConfig.featureLayer.id;
            this._isEditableLayerStore[layerId] = isEditable;
            var layer = this.map.getLayer(layerId);
            this.makeEditable(layer);
          }, this);

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

      _getSettingsParam: function() {
        var settings = {
          map: this.map,
        };

        for (var attr in this._configEditor) {
          settings[attr] = this._configEditor[attr];
        }
        settings.layerInfos = this._getLayerInfosParam();
        //settings.templatePicker = this._getTemplatePicker(settings.layerInfos);
        // set popup tolerance
        if(this._configEditor.popupTolerance !== undefined) {
          settings.singleSelectionTolerance = this._configEditor.popupTolerance;
        }

        return settings;
      },

    });
  });