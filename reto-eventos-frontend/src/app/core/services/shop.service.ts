import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CatalogoTienda, Pedido, PedidoPayload } from '../../models/api.models';

/** Tienda: el catálogo es público; los pedidos van con la sesión del usuario. */
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

  placeOrder(payload: PedidoPayload): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/pedidos`, payload);
  }

  myOrders(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/pedidos`);
  }

  cancelOrder(idPedido: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/pedidos/${idPedido}/anulacion`, {});
  }
}
