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

#ifndef __GD_UTILS_H__
#define __GD_UTILS_H__

#include <gtk/gtk.h>

GtkCssProvider *gd_load_css_provider_from_resource (const char *path, GError **error);

GdkPixbuf* gd_draw_task_list (GPtrArray* items);

char* gd_date_time_to_iso8601(GDateTime* datetime);

gboolean gd_date_time_equal(GDateTime* dt1, GDateTime* dt2);

#endif /* __GD_UTILS_H__ */
