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


const ListsModel = new Lang.Class({
    Name: 'ListsModel',
    Extends: Gtk.ListStore,

    _init: function()
    {
        this.parent();

        this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING,
                               GObject.TYPE_STRING, GObject.TYPE_STRING,
                               GdkPixbuf.Pixbuf, GObject.TYPE_INT64,
                               GObject.TYPE_BOOLEAN]);

        this._sources = {};
        this._lists = {};
        this._treeIters = {};
    },

    addSource: function(source)
    {
        source.forEachItem(Lang.bind(this, this._listAdded));

        source.connect('item-added', Lang.bind(this, this._listAdded));
        source.connect('item-updated', Lang.bind(this, this._listUpdated));
        source.connect('item-removed', Lang.bind(this, this._listRemoved));

        this._sources[source.id] = source;
    },

    removeSourceByID: function(sourceID)
    {
        let source = this._sources[sourceID];
        // FIXME: Kind of bad to use disconnectAll.
        source.disconnectAll();

        // Remove all TaskLists belonging to this source.
        let [res, iter] = this.get_iter_first();
        while(res) {
            let id = this.get_value(iter, Gd.MainColumns.ID);

            if (source.getItemByID(id))
                res = this.remove(iter);
            else
                res = this.iter_next(iter);
        }

        delete this._sources[sourceID];
    },

    getListFromPath: function(path)
    {
        let [res, iter] = this.get_iter(path);
        let listID = this.get_value(iter, Gd.MainColumns.ID);

        return this._lists[listID];
    },

    getListCount: function() {
        return Object.keys(this._lists).length;
    },

    _listAdded: function(source, list)
    {
        let iter = this.append();
        this._updateModel(list, iter);

        this._lists[list.id] = list;
        this._treeIters[list.id] = iter;
    },

    _listUpdated: function(source, list)
    {
        let iter = this._treeIters[list.id];
        this._updateModel(list, iter);

        this._lists[list.id] = list;
    },

    _listRemoved: function(source, list)
    {
        let iter = this._treeIters[list.id];
        this.remove(iter);

        delete this._lists[list.id];
        delete this._treeIters[list.id];
    },

    _updateModel: function(list, iter)
    {
        this.set_value(iter, Gd.MainColumns.ID, list.id);
        this.set_value(iter, Gd.MainColumns.PRIMARY_TEXT, list.title);

        let titles = [];
        for (let i = 0; i < list.items.length; i++)
            titles.push(list.items[i].title);

        let pixbuf = GdPrivate.draw_task_list(titles);
        this.set_value(iter, Gd.MainColumns.ICON, pixbuf);
    },
});
