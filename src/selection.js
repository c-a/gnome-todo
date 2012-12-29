/*
 * Copyright (c) 2012 Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 * Gnome Documents is free software; you can redistribute it and/or modify
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
 *
 */

const Gd = imports.gi.Gd;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GtkClutter = imports.gi.GtkClutter;

const _ = imports.gettext.gettext;
const Format = imports.format;
const Lang = imports.lang;
const Signals = imports.signals;

const Global = imports.global;
const Tweener = imports.util.tweener;
const Utils = imports.utils;

const SelectionController = new Lang.Class({
    Name: 'SelectionController',

    _init: function(mainController, listsView) {
        this._mainController = mainController;
        this._listsView = listsView;

        this._mainView = listsView.mainView;
        this._mainView.connect('view-selection-changed',
            Lang.bind(this, this._viewSelectionChanged));

        this._selectionToolbar = listsView.selectionToolbar;
        this._selectionToolbar.connect('delete-button-clicked',
            Lang.bind(this, this._deleteButtonClicked));
        this._selectionToolbar.connect('rename-button-clicked',
            Lang.bind(this, this._renameButtonClicked));
    },

    setActive: function(active) {
        this._mainView.set_selection_mode(active);
    },

    _viewSelectionChanged: function(mainView) {
        let selection = this._mainView.get_selection();

        if (selection.length > 0) {
            this._selectionToolbar.fadeIn();

            if (selection.length == 1)
                this._selectionToolbar.renameButton.show();
            else
                this._selectionToolbar.renameButton.hide();
        }
        else
            this._selectionToolbar.fadeOut();
    },

    _deleteButtonClicked: function() {
        let selection = this._mainView.get_selection();
        for (let i = 0; i < selection.length; i++)
        {
            let path = selection[i];
            let list = this._mainView.get_model().getListFromPath(path);
            let source = Global.sourceManager.sources[list.sourceID];

            source.deleteTaskList(list.id,
                Lang.bind(this, function(error) {
                    if (error)
                    {
                        let notification = new Gtk.Label({
                            label: Format.format('Failed to delete list (%s)', error.message) });
                        Global.notificationManager.addNotification(notification);
                    }
                    else
                        this._mainView.get_model().deleteByPath(path);
                }));
        }

        // No lists may still be selected so notify that the selection has changed
        this._viewSelectionChanged(this._mainView);
    },

    _renameButtonClicked: function() {

        let selection = this._mainView.get_selection();
        if (selection.length != 1)
            return;

        let list = this._mainView.get_model().getListFromPath(selection[0]);

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/rename_list_dialog.glade');

        let dialog = builder.get_object('rename_list_dialog');
        dialog.set_transient_for(this._mainController.window);

        let entry = builder.get_object('entry');
        entry.text = list.title;
        entry.connect('changed',
            Lang.bind(this, function(entry) {
                let updateButton = builder.get_object('update_button');
                updateButton.sensitive = (entry.text && entry.text != list.title);
            }));

        dialog.connect('response',
            Lang.bind(this, function(dialog, response_id) {

                if (response_id == Gtk.ResponseType.ACCEPT)
                {
                    let source = Global.sourceManager.sources[list.sourceID];
                    source.renameTaskList(list.id, entry.text,
                        Lang.bind(this, function(error, list) {
                            if (error) {
                                let notification = new Gtk.Label({ label: error.message });
                                Global.notificationManager.addNotification(notification);
                            }
                            else
                                this._mainView.get_model().update(list);
                        }));
                }

                dialog.destroy();
            }));

        dialog.show();
    },
});

const SelectionToolbar = new Lang.Class({
    Name: 'SelectionToolbar',
    Extends: GtkClutter.Actor,

    _init: function() {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/selection_toolbar.glade');
        this._toolbar = builder.get_object('toolbar');

        this.renameButton = builder.get_object('rename_button');
        this.renameButton.connect('clicked',
            Lang.bind(this, function(button) { this.emit('rename-button-clicked'); }));

        this.deleteButton = builder.get_object('delete_button');
        this.deleteButton.connect('clicked',
            Lang.bind(this, function(button) { this.emit('delete-button-clicked'); }));

        this.contents = this._toolbar;
        Utils.alphaGtkWidget(this.get_widget());

        // Show all widgets but hide actor by default
        this._toolbar.show_all();
        this.hide();
    },

    fadeIn: function() {
        if (this.opacity != 0)
            return;

        this.opacity = 0;
        this.show();

        Tweener.addTween(this,
            { opacity: 255,
              time: 0.30,
              transition: 'easeOutQuad' });
    },

    fadeOut: function() {
        Tweener.addTween(this,
            { opacity: 0,
                time: 0.30,
                transition: 'easeOutQuad',
                onComplete: function() {
                    this.hide();
                },
                onCompleteScope: this });
    }
});

Signals.addSignalMethods(SelectionToolbar.prototype);