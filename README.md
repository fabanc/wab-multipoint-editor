# wab-multipoint-editor

## Why another editor?

The out of the box editor provided for Web App Builder by Esri does not support geometry editing on multi-points geometries. This widget provides a solution for that.

## What about editing attributes?

It is not supported yet. This is something that I have in mind, but just did not have the time to implement yet. It is important to me at least when creating new features, as the feature service may require some fields to be populating in order to save a new feature.

If your multi-point feature class does not have required values, this widget will allow you to add the new multi-point features, while the Edit widget will let you edit attributes.

## How to deploy?

In order to use that widget, copy the folder MultiPoint editor in you web app builder folder, under client\stemapp\widgets.

# How to use.

When the widget is open click on the multipoint layer that needs to be edited, in order to select a graphic. Once the graphic is selected, feature action commande will be enables. You can move vertices, delete vertices, add vertices on an existing geometry using the action in the drop down list. The delete button will delete the whole geometry, no just the vertex. In order to stop editing a geometry and work on another feature, you need to click the stop edit button.