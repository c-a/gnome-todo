/*
 * gnome-todo
 * Copyright (C) Carl-Anton 2012 <carlantoni@gnome.org>
 * 
 * gnome-todo is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * gnome-todo is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.";
 */

#ifndef _GD_GTASKS_SERVICE_H_
#define _GD_GTASKS_SERVICE_H_

#include <glib-object.h>
#include <gio/gio.h>

G_BEGIN_DECLS

#define GD_TYPE_GTASKS_SERVICE_PARAMETER (gd_gtasks_service_parameter_get_type())

typedef struct _GdGTasksServiceParameter GdGTasksServiceParameter;

GType gd_gtasks_service_parameter_get_type (void) G_GNUC_CONST;

GdGTasksServiceParameter *gd_gtasks_service_parameter_new (const char *name, const char *value);


#define GD_TYPE_GTASKS_SERVICE             (gd_gtasks_service_get_type ())
#define GD_GTASKS_SERVICE(obj)             (G_TYPE_CHECK_INSTANCE_CAST ((obj), GD_TYPE_GTASKS_SERVICE, GdGTasksService))
#define GD_GTASKS_SERVICE_CLASS(klass)     (G_TYPE_CHECK_CLASS_CAST ((klass), GD_TYPE_GTASKS_SERVICE, GdGTasksServiceClass))
#define GD_IS_GTASKS_SERVICE(obj)          (G_TYPE_CHECK_INSTANCE_TYPE ((obj), GD_TYPE_GTASKS_SERVICE))
#define GD_IS_GTASKS_SERVICE_CLASS(klass)  (G_TYPE_CHECK_CLASS_TYPE ((klass), GD_TYPE_GTASKS_SERVICE))
#define GD_GTASKS_SERVICE_GET_CLASS(obj)   (G_TYPE_INSTANCE_GET_CLASS ((obj), GD_TYPE_GTASKS_SERVICE, GdGTasksServiceClass))

typedef struct _GdGTasksServiceClass GdGTasksServiceClass;
typedef struct _GdGTasksService GdGTasksService;
typedef struct _GdGTasksServicePrivate GdGTasksServicePrivate;



struct _GdGTasksServiceClass
{
	GObjectClass parent_class;
};

struct _GdGTasksService
{
	GObject parent_instance;

	GdGTasksServicePrivate *priv;
};

GType gd_gtasks_service_get_type (void) G_GNUC_CONST;

GdGTasksService *gd_gtasks_service_new (const char *consumer_key,
                                        const char *consumer_secret);

void    gd_gtasks_service_call         (GdGTasksService *service,
                                        const char *method,
                                        const char *function,
                                        GPtrArray *parameters,
                                        GCancellable *cancellable,
                                        GAsyncReadyCallback callback,
                                        gpointer user_data);

gboolean gd_gtasks_service_call_finish (GdGTasksService *service,
                                        GAsyncResult *result,
                                        GBytes **body,
                                        GError **error);
G_END_DECLS

#endif /* _GD_GTASKS_SERVICE_H_ */
