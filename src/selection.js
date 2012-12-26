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
const Lang = imports.lang;
const Signals = imports.signals;

const Tweener = imports.util.tweener;
const Utils = imports.utils;

const SelectionController = new Lang.Class({
    Name: 'SelectionController',

    _init: function(contentView) {
        this._contentView = contentView;
        this._mainView = contentView.mainView;
        this._selectionToolbar = contentView.selectionToolbar;
    },

    setActive: function(active) {
        this._mainView.set_selection_mode(active);

        if (active)
            this._selectionToolbar.fadeIn();
        else
            this._selectionToolbar.fadeOut();
    }
});

const SelectionToolbar = new Lang.Class({
    Name: 'SelectionToolbar',
    Extends: GtkClutter.Actor,

    _init: function() {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/selection_toolbar.glade');
        this._toolbar = builder.get_object('toolbar');

        this._renameButton = builder.get_object('rename_button');
        this._renameButton.connect('clicked',
            Lang.bind(this, function(button) { this.emit('rename-button-clicked'); }));

        this._deleteButton = builder.get_object('delete_button');
        this._deleteButton.connect('clicked',
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