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

#include <rest/oauth-proxy.h>

#include "gd-gtasks-service.h"

struct _GdGTasksServiceParameter {
  char *name;
  char *value;

  int ref_count;
};

static void
gd_gtasks_service_parameter_ref (GdGTasksServiceParameter *parm)
{
  parm->ref_count++;
}

static void
gd_gtasks_service_parameter_unref (GdGTasksServiceParameter *parm)
{
  if (--parm->ref_count == 0)
  {
    g_free (parm->name);
    g_free (parm->value);

    g_slice_free (GdGTasksServiceParameter, parm);
  }
}

G_DEFINE_BOXED_TYPE (GdGTasksServiceParameter, gd_gtasks_service_parameter,
                     (GBoxedCopyFunc)gd_gtasks_service_parameter_ref,
                     (GBoxedFreeFunc)gd_gtasks_service_parameter_unref);

GdGTasksServiceParameter *
gd_gtasks_service_parameter_new (const char *name, const char *value)
{
  GdGTasksServiceParameter *parm = g_slice_new0 (GdGTasksServiceParameter);

  parm->name = g_strdup (name);
  parm->value = g_strdup (value);
}


#define GTASKS_URL "https://www.googleapis.com/tasks/v1/"

enum {
	PROP_0,
	PROP_CONSUMER_KEY,
	PROP_CONSUMER_SECRET,
  PROP_TOKEN,
  PROP_TOKEN_SECRET,
};

struct _GdGTasksServicePrivate {
	/* Properties */
	char *consumer_key;
	char *consumer_secret;

  RestProxy *proxy;
};


G_DEFINE_TYPE (GdGTasksService, gd_gtasks_service, G_TYPE_OBJECT);


static void
invoke_async_cb (GObject *source_object,
                 GAsyncResult *result,
                 gpointer user_data)
{
  RestProxyCall *call = REST_PROXY_CALL (source_object);
  GSimpleAsyncResult *simple = user_data;

  GError *err = NULL;
  GBytes *body;

  if (!rest_proxy_call_invoke_finish (call, result, &err))
  {
    g_simple_async_result_take_error (simple, err);
    goto done;
  }

  if (rest_proxy_call_get_status_code (call) != 500)
  {
    g_simple_async_result_set_error (simple, G_IO_ERROR, G_IO_ERROR_FAILED,
                                     "%s", rest_proxy_call_get_status_message (call));
    goto done;
  }

  body = g_bytes_new (rest_proxy_call_get_payload (call),
                      rest_proxy_call_get_payload_length (call));
  g_simple_async_result_set_op_res_gpointer (simple, body, (GDestroyNotify)g_bytes_unref);
  
done:
  g_simple_async_result_complete (simple);
  g_object_unref (simple);
}

/**
 * gd_gtasks_service_call:
 * @parameters: (element-type Gt.GtasksServiceParameter)
 */
void
gd_gtasks_service_call (GdGTasksService *service,
                        const char *method,
                        const char *function,
                        GPtrArray *parameters,
                        GAsyncReadyCallback callback,
                        GCancellable *cancellable,
                        gpointer user_data)
{
  GSimpleAsyncResult *simple;
  RestProxyCall *call;
  int i;

  simple = g_simple_async_result_new (G_OBJECT (service), callback, user_data,
                                      gd_gtasks_service_call);

  call = rest_proxy_new_call (service->priv->proxy);

  rest_proxy_call_set_method (call, method);
  rest_proxy_call_set_function (call, function);

  for (i = 0; i < parameters->len; i++)
  {
    GdGTasksServiceParameter *param = g_ptr_array_index (parameters, i);
    rest_proxy_call_add_param (call, param->name, param->value);
  }

  rest_proxy_call_invoke_async (call, cancellable, invoke_async_cb, simple);
}

gboolean
gd_gtasks_service_call_finish (GdGTasksService *service,
                               GAsyncResult *result,
                               GBytes **body,
                               GError **error)
{
  GSimpleAsyncResult *simple;
  
  g_return_val_if_fail (g_simple_async_result_is_valid (result,
                                                        G_OBJECT (service),
                                                        gd_gtasks_service_call),
                        FALSE);

  simple = (GSimpleAsyncResult *)result;

  if (g_simple_async_result_propagate_error (simple, error))
    return FALSE;

  if (body)
    *body = g_bytes_ref ((GBytes *)g_simple_async_result_get_op_res_gpointer (simple));

  return TRUE;
}

GdGTasksService *
gd_gtasks_service_new (const char *consumer_key,
                       const char *consumer_secret)
{
  return g_object_new (GD_TYPE_GTASKS_SERVICE,
                       "consumer-key", consumer_key,
                       "consumer-secret", consumer_secret,
                       NULL);
}

static void
gd_gtasks_service_init (GdGTasksService *service)
{
	service->priv =
		G_TYPE_INSTANCE_GET_PRIVATE(service, GD_TYPE_GTASKS_SERVICE,
		                            GdGTasksServicePrivate);
}

static void
gd_gtasks_service_set_property (GObject *object, guint prop_id, const GValue *value, GParamSpec *pspec)
{
  GdGTasksService *service = GD_GTASKS_SERVICE (object);

	switch (prop_id) {
		case PROP_CONSUMER_KEY:
			service->priv->consumer_key = g_value_dup_string (value);
			break;
		case PROP_CONSUMER_SECRET:
			service->priv->consumer_secret = g_value_dup_string (value);
			break;
    case PROP_TOKEN:
      g_object_set_property (G_OBJECT (service->priv->proxy), "token", value);
      break;
    case PROP_TOKEN_SECRET:
      g_object_set_property (G_OBJECT (service->priv->proxy), "token-secret", value);
      break;
		default:
			G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
			break;
  }
}

static void
gd_gtasks_service_get_property (GObject *object, guint prop_id, GValue *value, GParamSpec *pspec)
{
  GdGTasksService *service = GD_GTASKS_SERVICE (object);

	switch (prop_id) {
		case PROP_CONSUMER_KEY:
			g_value_set_string (value, service->priv->consumer_key);
			break;
		case PROP_CONSUMER_SECRET:
			g_value_set_string (value, service->priv->consumer_key);
			break;
    case PROP_TOKEN:
      g_value_set_string (value,
                          oauth_proxy_get_token (OAUTH_PROXY (service->priv->proxy)));
      break;
    case PROP_TOKEN_SECRET:
      g_value_set_string (value,
                          oauth_proxy_get_token_secret (OAUTH_PROXY (service->priv->proxy)));
      break;
		default:
			G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
			break;
	}
}

static void
gd_gtasks_service_constructed (GObject *object)
{
	GdGTasksService *service = (GdGTasksService *)object;

	service->priv->proxy = oauth_proxy_new (service->priv->consumer_key,
                                          service->priv->consumer_secret,
                                          GTASKS_URL, FALSE);
  
	G_OBJECT_CLASS (gd_gtasks_service_parent_class)->constructed (object);
}

static void
gd_gtasks_service_finalize (GObject *object)
{
  GdGTasksService *service = GD_GTASKS_SERVICE (object);

  g_free (service->priv->consumer_key);
  g_free (service->priv->consumer_secret);
  
  g_clear_object (&service->priv->proxy);
    
	G_OBJECT_CLASS (gd_gtasks_service_parent_class)->finalize (object);
}

static void
gd_gtasks_service_class_init (GdGTasksServiceClass *klass)
{
	GObjectClass* object_class = G_OBJECT_CLASS (klass);
	GObjectClass* parent_class = G_OBJECT_CLASS (klass);

  object_class->set_property = gd_gtasks_service_set_property;
  object_class->get_property = gd_gtasks_service_get_property;
  
	object_class->constructed = gd_gtasks_service_constructed;
	object_class->finalize = gd_gtasks_service_finalize;

	g_object_class_install_property (object_class, PROP_CONSUMER_KEY,
	                                 g_param_spec_string ("consumer-key", "consumer-key",
	                                                      "The OAuth consumer key", NULL,
	                                                      G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY |
                                                        G_PARAM_STATIC_STRINGS));

	g_object_class_install_property (object_class, PROP_CONSUMER_SECRET,
	                                 g_param_spec_string ("consumer-secret", "consumer-secret",
	                                                      "The OAuth consumer secret", NULL,
	                                                      G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY |
                                                        G_PARAM_STATIC_STRINGS));

  g_object_class_install_property (object_class, PROP_TOKEN,
                                   g_param_spec_string ("token", "token",
                                                        "The OAuth token", NULL,
                                                        G_PARAM_READWRITE | G_PARAM_CONSTRUCT |
                                                        G_PARAM_STATIC_STRINGS));

  g_object_class_install_property (object_class, PROP_TOKEN_SECRET,
                                   g_param_spec_string ("token-secret", "token-secret",
                                                        "The OAuth token secret", NULL,
                                                        G_PARAM_READWRITE | G_PARAM_CONSTRUCT |
                                                        G_PARAM_STATIC_STRINGS));

  g_type_class_add_private (object_class, sizeof(GdGTasksServicePrivate));
}

