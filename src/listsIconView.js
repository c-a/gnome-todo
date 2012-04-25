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

const Gd = imports.gi.Gd;
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
const Utils = imports.utils;
const WindowMode = imports.windowMode;

const _VIEW_ITEM_WIDTH = 140
const _VIEW_ITEM_WRAP_WIDTH = 128
const _VIEW_COLUMN_SPACING = 20
const _VIEW_MARGIN = 16

const ListsIconView = Lang.Class({
    Name: 'ListsIconView',
    Extends: Gtk.IconView,

    _init: function() {
        this.parent({
            column_spacing: _VIEW_COLUMN_SPACING,
            margin: _VIEW_MARGIN,
            expand: true,
            selection_mode: Gtk.SelectionMode.NONE
        });

        this._pixbuf_cell =
            new Gd.TogglePixbufRenderer({ xalign: 0.5, yalign: 0.5 });
        this.pack_start(this._pixbuf_cell, false);
    },

    set_selection_mode: function(selection_mode) {
        this._selection_mode = selection_mode;

        this._pixbuf_cell.toggle_visible = selection_mode;
        this.queue_draw();
    }
});
