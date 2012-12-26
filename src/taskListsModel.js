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

const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Gd = imports.gi.Gd;
const GdPrivate = imports.gi.GdPrivate;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Cairo = imports.cairo;
const Gettext = imports.gettext;
const _ = imports.gettext.gettext;

const Lang = imports.lang;

const Global = imports.global;
const Utils = imports.utils;

const PIXBUF_WIDTH = 140;
const PIXBUF_HEIGHT = 180;

const TaskListsModel = Lang.Class({
    Name: 'TaskListsModel',
    Extends: Gtk.ListStore,

    _init: function()
    {
        this.parent();

        this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING,
                               GObject.TYPE_STRING, GObject.TYPE_STRING,
                               GdkPixbuf.Pixbuf, GObject.TYPE_INT64,
                               GObject.TYPE_BOOLEAN]);

        this._lists = {};
    },

    add: function(list)
    {
        let iter = this.append();
        this.set_value(iter, Gd.MainColumns.ID, list.id);
        this.set_value(iter, Gd.MainColumns.PRIMARY_TEXT, list.title);

        let pixbuf = GdPrivate.draw_task_list(list.items);
        this.set_value(iter, Gd.MainColumns.ICON, pixbuf);

        this._lists[list.id] = list;
    },

    removeBySourceID: function(sourceID)
    {
        let [res, iter] = this.get_iter_first();
        while(res) {
            let id = this.get_value(iter, Gd.MainColumns.ID);
            let list = this._lists[id];

            if (list.sourceID == sourceID)
                res = this.remove(iter);
            else
                res = this.iter_next(iter);
        }
    },

    nItems: function()
    {
        let nItems = 0;
        for(let [res, iter] = this.get_iter_first(); res; res = this.iter_next(iter))
            nItems++;

        return nItems;
    },

    getListFromPath: function(path)
    {
        let [res, iter] = this.get_iter(path);
        let id = this.get_value(iter, Gd.MainColumns.ID);

        return this._lists[id];
    },

    deleteByPath: function(path)
    {
        let [res, iter] = this.get_iter(path);
        let id = this.get_value(iter, Gd.MainColumns.ID);
        
        this.remove(iter);
        delete this._lists[id];
    },
    
    _drawPixbuf: function(items)
    {
        let provider = GdPrivate.load_css_provider_from_resource('/org/gnome/todo/gnome-todo.css');

        let style_context = new Gtk.StyleContext();
        let path = new Gtk.WidgetPath();
        path.append_type(Gd.MainIconView);
        style_context.set_path(path);
        style_context.add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        style_context.add_class('todo-task-list-renderer');

        let border = style_context.get_border(Gtk.StateFlags.NORMAL);
        let padding = style_context.get_padding(Gtk.StateFlags.NORMAL);

        let width = PIXBUF_WIDTH + padding.left + padding.right + border.left + border.right;
        let height = PIXBUF_HEIGHT + padding.top + padding.bottom + border.top + border.bottom;

        let surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, width, height);
        let context = new Cairo.Context(surface);

        Gtk.render_background(style_context, context, padding.left, padding.top,
                              PIXBUF_WIDTH + border.left + border.right,
                              PIXBUF_WIDTH + border.top + border.bottom);

        return Gdk.pixbuf_get_from_surface(surface, 0, 0, width, height);
    }
});
