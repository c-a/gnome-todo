/*
 * Copyright (c) 2012 Carl-Anton Ingmarsson
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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GtkClutter = imports.gi.GtkClutter;
const Pango = imports.gi.Pango;

const Gettext = imports.gettext;
const _ = imports.gettext.gettext;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Global = imports.global;
const Signals = imports.signals;

const _MAIN_PAGE = 0;
const _SELECTION_PAGE = 1;

const MainToolbar = new Lang.Class({
    Name: 'MainToolbar',
    Extends: Gtk.Toolbar,

    _init: function(params) {
        this.parent({ icon_size: Gtk.IconSize.MENU });
        this.get_style_context().add_class(Gtk.STYLE_CLASS_MENUBAR);

        let item = new Gtk.ToolItem({ expand: true });
        item.set_expand(true);
        this.add(item);

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/main_toolbar.glade');
        this._notebook = builder.get_object('notebook');
        item.add(this._notebook);

        let newButton = builder.get_object('new_button');
        newButton.connect('clicked',
            Lang.bind(this, this._newButtonClicked));

        // Selection button
        let selectButton = builder.get_object('select_button');
        selectButton.setSymbolic('emblem-default-symbolic');
        selectButton.connect('clicked',
            Lang.bind(this, this._selectButtonClicked));
        
        // Cancel selection button
        let cancelButton = builder.get_object('cancel_button');
        cancelButton.connect('clicked',
            Lang.bind(this, this._cancelButtonClicked));

        this._listsButton = builder.get_object('lists_button');
        this._listsButton.connect('toggled',
            Lang.bind(this, this._listsButtonToggled));

        this._todayButton = builder.get_object('today_button');
        this._todayButton.connect('toggled',
            Lang.bind(this, this._todayButtonToggled));

        this._scheduledButton = builder.get_object('scheduled_button');
        this._scheduledButton.connect('toggled',
            Lang.bind(this, this._scheduledButtonToggled));

        this.show_all();
    },

    _getVerticalSizeGroup: function() {
        let dummy = new Gtk.ToggleButton();
        dummy.add(Gtk.Image.new_from_stock(Gtk.STOCK_OPEN, Gtk.IconSize.MENU));
        dummy.show_all();

        let size = new Gtk.SizeGroup(Gtk.SizeGroup.VERTICAL);
        size.add_widget(dummy);
        return size;
    },

    _selectButtonClicked: function(selectButton) {
        this._notebook.set_current_page(_SELECTION_PAGE);

        this.get_style_context().add_class('selection-mode');
        this.reset_style();

        this.emit('selection-mode-toggled', true);
    },

    _cancelButtonClicked: function(cancelButton) {
        this._notebook.set_current_page(_MAIN_PAGE);

        this.get_style_context().remove_class('selection-mode');
        this.reset_style();

        this.emit('selection-mode-toggled', false);
    },

    _listsButtonToggled: function(listsButton) {
        if (!listsButton.get_active())
            return;
    },

    _todayButtonToggled: function(listsButton) {
        if (!listsButton.get_active())
            return;
    },

    _scheduledButtonToggled: function(listsButton) {
        if (!listsButton.get_active())
            return;
    },

    _newButtonClicked: function(newButton) {
        this.emit('new-button-clicked');
    }
});

Signals.addSignalMethods(MainToolbar.prototype);