import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CatalogoTienda, Pedido, PedidoPayload } from '../../models/api.models';

/**
 * Tienda: el catálogo es público y se compra con cuenta o sin ella. El historial es de las cuentas;
 * un pedido de invitado se abre con su referencia y su clave, que va en una cabecera y no en la
 * dirección, para que no quede en los registros del servidor.
 */
@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tienda`;
  private catalogRequest: Observable<CatalogoTienda> | null = null;

  /**
   * El catálogo se pide una vez y lo comparten la tienda y las fichas. Tras un pedido o una
   * anulación se vuelve a pedir, para que las existencias sean las del centro de distribución.
   */
  catalog(refresh = false): Observable<CatalogoTienda> {
    if (!this.catalogRequest || refresh) {
      this.catalogRequest = this.http.get<CatalogoTienda>(`${this.apiUrl}/catalogo`).pipe(
        catchError((error: unknown) => {
          this.catalogRequest = null;
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.catalogRequest;
  }

  /** Con sesión, el pedido va a la cuenta; sin ella, el servidor lo crea como pedido de invitado. */
  placeOrder(payload: PedidoPayload): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/pedidos`, payload);
  }

  myOrders(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/pedidos`);
  }

  cancelOrder(idPedido: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/pedidos/${idPedido}/anulacion`, {});
  }

  guestOrder(reference: string, key: string): Observable<Pedido> {
    return this.http.get<Pedido>(this.guestUrl(reference), { headers: guestHeaders(key) });
  }

  cancelGuestOrder(reference: string, key: string): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.guestUrl(reference)}/anulacion`, {}, { headers: guestHeaders(key) });
  }

  private guestUrl(reference: string): string {
    return `${this.apiUrl}/consulta/${encodeURIComponent(reference)}`;
  }
}

/**
 * Dirección privada de un pedido de invitado. La clave va tras la almohadilla: el navegador no la
 * envía a ningún servidor ni la pasa como procedencia a otras páginas.
 */
export function guestOrderLink(order: Pedido, key: string): string {
  return `${window.location.origin}/tienda/pedido/${encodeURIComponent(order.referencia)}#${key}`;
}

function guestHeaders(key: string): HttpHeaders {
  return new HttpHeaders({ 'X-Clave-Pedido': key });
}
