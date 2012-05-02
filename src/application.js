/*
 * Copyright (c) 2011 Red Hat, Inc.
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
 * Author: Cosimo Cecchi <cosimoc@redhat.com>
 *
 */

const DBus = imports.dbus;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Gettext = imports.gettext;
const _ = imports.gettext.gettext;

const GtkClutter = imports.gi.GtkClutter;
const EvDoc = imports.gi.EvinceDocument;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Goa = imports.gi.Goa;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Tracker = imports.gi.Tracker;

const Error = imports.error;
const Format = imports.format;
const Global = imports.global;
const Main = imports.main;
const MainWindow = imports.mainWindow;
const Notifications = imports.notifications;
const Path = imports.path;
const Tweener = imports.util.tweener;
const WindowMode = imports.windowMode;

const Application = new Lang.Class({
    Name: 'Application',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({ application_id: 'org.gnome.Todo' });

        Gettext.bindtextdomain('gnome-todo', Path.LOCALE_DIR);
        Gettext.textdomain('gnome-todo');
        GLib.set_prgname('gnome-todo');

        Global.settings = new Gio.Settings({ schema: 'org.gnome.todo' });
    },

    _initMenus: function() {
        let quitAction = new Gio.SimpleAction({ name: 'quit' });
	    quitAction.connect('activate', Lang.bind(this,
                function() {
                    this._mainWindow.window.destroy();
	        }));
	    this.add_action(quitAction);

        let aboutAction = new Gio.SimpleAction({ name: 'about' });
        aboutAction.connect('activate', Lang.bind(this,
            function() {
                this._mainWindow.showAbout();
            }));
        this.add_action(aboutAction);

        let fsAction = new Gio.SimpleAction({ name: 'fullscreen' });
        fsAction.connect('activate', Lang.bind(this,
            function() {
                Global.modeController.toggleFullscreen();
            }));
        Global.modeController.connect('can-fullscreen-changed', Lang.bind(this,
            function() {
                let canFullscreen = Global.modeController.getCanFullscreen();
                fsAction.set_enabled(canFullscreen);
            }));
        this.add_action(fsAction);

        let menu = new Gio.Menu();

        let docActions = new Gio.Menu();
        docActions.append(_("Fullscreen"), 'app.fullscreen');
        menu.append_section(null, docActions);

        menu.append(_("About To Do"), 'app.about');
        menu.append(_("Quit"), 'app.quit');

        this.set_app_menu(menu);
    },

    vfunc_startup: function() {
        this.parent();

        String.prototype.format = Format.format;

        GtkClutter.init(null, null);
        Tweener.init();

        Global.application = this;

        //Global.sources = new Sources.SourceManager();
        Global.errorHandler = new Error.ErrorHandler();
        Global.modeController = new WindowMode.ModeController();
        Global.notificationManager = new Notifications.NotificationManager();

        this._initMenus();
        this._mainWindow = new MainWindow.MainWindow(this);
    },

    vfunc_activate: function() {
        Global.modeController.setWindowMode(WindowMode.WindowMode.OVERVIEW);
        this._mainWindow.show();
    }
});
