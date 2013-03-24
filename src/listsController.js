/*
 * Copyright (c) 2012 Carl-Anton Ingmarsson
 *
 * Gnome Todo is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome Documents is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome Documents; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Carl-Anton Ingmarsson <carlantoni@gnome.org>
 */

const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;

const Config = imports.config;
const Global = imports.global;
const ListEditor = imports.listEditor;
const ListsModel = imports.listsModel;
const ListsView = imports.listsView;
const ListsToolbar = imports.listsToolbar;
const MainController = imports.mainController;
const Selection = imports.selection;
const Utils = imports.utils;

const ListsController = new Lang.Class({
    Name: 'ListsController',
    Extends: MainController.Controller,

    _init: function(mainController) {
        this.parent(mainController);

        this._initActions();

        this._listsView = new ListsView.ListsView(this.window);

        // Create SelectionController handling selections
        this._selectionController = new Selection.SelectionController(this, this._listsView);
        this._selectionModeActive = false;
        
        this._toolbar = new ListsToolbar.ListsToolbar(this.window);

        this._model = new ListsModel.ListsModel();
        this._listsView.mainView.set_model(this._model);
        this._model.connect('row-inserted', Lang.bind(this, this._updateContentView));
        this._model.connect('row-deleted', Lang.bind(this, this._updateContentView));

        this._outstandingLoads = 0;
        this._outstandingSyncs = 0;

        this._listsView.mainView.connect('item-activated',
            Lang.bind(this, this._itemActivated));

        Global.sourceManager.forEachItem(Lang.bind(this, function(source) {
            this._sourceAdded(null, source);
        }));
        Global.sourceManager.connect('item-added',
            Lang.bind(this, this._sourceAdded));
        Global.sourceManager.connect('item-removed',
            Lang.bind(this, this._sourceRemoved));
    },

    _initActions: function() {
        let actionEntries = [
            {
                name: 'new-list',
                callback: this._newList,
                enabled: false
            },
            {
                name: 'selection',
                state: GLib.Variant.new('b', false)
            },
            {
                name: 'search',
                state: GLib.Variant.new('b', false)
            }];

        this._actions = Utils.createActions(this, actionEntries);
    },

    activate: function() {
        this.window.setToolbarWidget(this._toolbar);

        Utils.addActions(this.window, this._actions);
    },

    deactivate: function() {
        this.window.setToolbarWidget(null);

        Utils.removeActions(this.window, this._actions);
    },

    getView: function() {
        return this._listsView;
    },

    sync: function() {
        // FIXME: Should only sync loaded sources
        Global.sourceManager.forEachItem(Lang.bind(this, function(source) {
            this._syncSource(source);
        }));
    },

    shutdown: function() {
        // FIXME: Should only save loaded sources
        Global.sourceManager.forEachItem(Lang.bind(this, function(source) {
            source.save();
        }));
    },

    _sourceAdded: function(manager, source) {
        this._loadSource(source);
    },

    _sourceRemoved: function(manager, source) {
        this._model.removeSource(source);
        this._updateContentView();
    },

    _sourceSaveError: function(source, error) {
        let notification = new Gtk.Label({ label: error.message });
        Global.notificationManager.addNotification(notification);
    },

    _loadSource: function(source) {
        this._outstandingLoads++;
        this._updateContentView();

        source.load(Lang.bind(this, function(error) {
            this._outstandingLoads--;

            if (error) {
                let notification = new Gtk.Label({ label: error.message });
                Global.notificationManager.addNotification(notification);

                this._updateContentView();
                return;
            }

            this._model.addSource(source);
            source.connect('save-error', this._sourceSaveError);
            this._syncSource(source);

            this._updateContentView();
        }));
    },

    _syncSource: function(source) {
        this._outstandingSyncs++;

        source.sync(Lang.bind(this, function(error) {
            this._outstandingSyncs--;

            if (error) {
                let notification = new Gtk.Label({ label: error.message });
                Global.notificationManager.addNotification(notification);
                return;
            }
        }));
    },

    _updateContentView: function() {
        if (this._outstandingLoads > 0)
        {
            this._actions['new-list'].enabled = false;
            this._actions['search'].enabled = false;
            this._actions['selection'].enabled = false;
            this._listsView.showLoading(true);
        }

        else {
            if (Global.sourceManager.getItemsCount() == 0) {
                this._actions['new-list'].enabled = false;
                this._actions['search'].enabled = false;
                this._actions['selection'].enabled = false;
                this._listsView.showNoAccounts();
            }
            else {
                this._actions['new-list'].enabled = true;

                if (this._model.getListCount() == 0) {
                    this._actions['search'].enabled = false;
                    this._actions['selection'].enabled = false;
                    this._listsView.showNoResults();
                }
                else {
                    this._actions['search'].enabled = true;
                    this._actions['selection'].enabled = true;
                    this._listsView.showMainView();
                }
            }
        }
    },

    _newList: function(action) {

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/new_list_dialog.glade');

        let dialog = builder.get_object('new_list_dialog');
        dialog.set_transient_for(this.window);

        let entry = builder.get_object('entry');
        entry.connect('changed',
            Lang.bind(this, function(entry) {
                let createButton = builder.get_object('create_button');
                createButton.sensitive = !!entry.text;
            }));
        entry.connect('activate', function(entry) {
            if (entry.text)
                dialog.response(Gtk.ResponseType.ACCEPT);
        });

        dialog.connect('response',
            Lang.bind(this, function(dialog, response_id) {

                if (response_id == Gtk.ResponseType.ACCEPT)
                {
                    let source = Global.sourceManager.getDefaultSource();

                    let entry = builder.get_object('entry');
                    source.createTaskList(entry.text);
                }

                dialog.destroy();
            }));

        dialog.show();
    },

    _itemActivated: function(mainView, id, path) {
        let list = this._model.getListFromPath(path);
        let listEditor = new ListEditor.ListEditorController(this.mainController, list);
        this.mainController.pushController(listEditor);
    },

    onCancel: function() {
        if (this.window.get_action_state('search').get_boolean())
            this.window.change_action_state('search', GLib.Variant.new('b', false));

        else if (this.window.get_action_state('selection').get_boolean())
            this.window.change_action_state('selection', GLib.Variant.new('b', false));
    },

    keyPressEvent: function(event) {
        return this._listsView.handleEvent(event);
    },
});
