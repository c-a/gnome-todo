/*
 * Copyright (c) 2013 Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 * Gnome To Do is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome To Do is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome To Do; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 */

const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;

const Format = imports.format;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const _ = imports.gettext.gettext;

const Global = imports.global;
const ListsController = imports.listsController;
const Main = imports.main;
const MainController = imports.mainController;
const MainWindow = imports.mainWindow;
const Notifications = imports.notifications;
const Path = imports.path;
const Sources = imports.sources;
const Utils = imports.utils;

const Application = new Lang.Class({
    Name: 'Application',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({ application_id: 'org.gnome.Todo' });

        Gettext.bindtextdomain('gnome-todo', Path.LOCALE_DIR);
        Gettext.textdomain('gnome-todo');
        GLib.set_prgname('gnome-todo');

        Global.settings = new Gio.Settings({ schema: 'org.gnome.todo' });

        Utils.loadResource();
    },

    _initMenus: function() {
        let actionEntries = [
            { name: 'sync', callback: this._sync },
            { name: 'about', callback: this._showAbout },
            { name: 'quit', callback: this._quit }];

        let actions = Utils.createActions(this, actionEntries);
        for (let name in actions) {
            this.add_action(actions[name]);
        }

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/app-menu.ui');

        let menu = builder.get_object('app-menu');
        this.set_app_menu(menu);
    },

    _initAccelerators: function() {
        let accelerators = [
            { accelerator: '<Primary>n', action: 'win.lists.new' },
            { accelerator: '<Primary>n', action: 'win.list-editor.new'},
            { accelerator: '<Primary>d', action: 'win.list-editor.delete'}];

        accelerators.forEach(Lang.bind(this, function(accel) {
            this.add_accelerator(accel.accelerator, accel.action, null);
        }));
    },

    _sync: function(action) {
        this._mainController.sync();
    },

    _showAbout: function(action) {
        this._mainWindow.showAbout();
    },

    _quit: function(action) {
        this.quit();
    },
    
    vfunc_startup: function() {
        this.parent();

        String.prototype.format = Format.format;

        this._initMenus();
        this._initAccelerators();

        Global.application = this;
        Global.notificationManager = new Notifications.NotificationManager();
        Global.sourceManager = new Sources.SourceManager();
        Global.sourceManager.connect('load-error', Lang.bind(this, this._sourceLoadError));

        this._mainWindow = new MainWindow.MainWindow(this);
        this._mainController = new MainController.MainController(this._mainWindow);
        // Add the initial controller
        let listsController = new ListsController.ListsController(this._mainController);
        this._mainController.pushController(listsController);

        // Load the sources now when we've setup the UI
        Global.sourceManager.loadSources();
    },

    _sourceLoadError: function(sourceManager, source, error) {
        let message = _('Unable to load %s source.').format(source.name);
        log(message + ' The error was: ' + error.message);

        let notification = new Gtk.Label({ label: message });
        Global.notificationManager.addNotification(notification);
    },

    vfunc_activate: function() {
        this._mainWindow.show();
    },

    vfunc_shutdown: function() {
        this._mainController.shutdown();

        Gtk.Application.prototype.vfunc_shutdown.call(this);
    }
});
