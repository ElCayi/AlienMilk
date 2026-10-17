import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { Reserva, Usuario, EventoAdmin } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { AdminSummaryService } from '../admin-summary.service';
import { AdminReservationsPanelComponent } from './admin-reservations-panel.component';

const reservation = (idReserva: number, cantidad: number): Reserva =>
  ({
    idReserva,
    cantidad,
    idEvento: 1,
    username: 'ana',
    nombreCliente: 'Ana',
    nombreEvento: 'Degustación',
    estadoEvento: 'ACTIVO',
    fechaInicioEvento: '2026-11-15',
    horaInicioEvento: '19:00',
    precioVenta: 20,
    asistentes: [],
  }) as unknown as Reserva;

describe('Búsqueda operativa de reservas', () => {
  let panel: AdminReservationsPanelComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminReservationsPanelComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: {} },
        { provide: PanelConfirmService, useValue: {} },
        { provide: AdminSummaryService, useValue: {} },
      ],
    });
    panel = TestBed.createComponent(AdminReservationsPanelComponent).componentInstance;
    panel.reservations.set([
      {
        ...reservation(7, 2),
        telefono: '+34 600 123 456',
        asistentes: [{ nombre: 'Lucía' } as Reserva['asistentes'][number]],
      },
      reservation(12, 3),
    ]);
    panel.users.set([{ username: 'ana', email: 'ana@example.test' } as Usuario]);
    panel.sessions.set([{ idEvento: 1, aforoMaximo: 40 } as EventoAdmin]);
  });

  it('encuentra por localizador, teléfono, correo y participante', () => {
    for (const query of ['0007', '600123456', 'Lucia']) {
      panel.query.set(query);
      expect(panel.visible().map((r) => r.idReserva)).toEqual([7]);
    }
    panel.query.set('ana@example.test');
    expect(panel.visible()).toHaveLength(2);
  });

  it('mantiene ocupación e historial completos al buscar una sola reserva', () => {
    panel.query.set('0007');
    expect(panel.sessionGroups()[0]).toMatchObject({ plazas: 5, aforo: 40, coincidencias: 1 });
    expect(panel.clients()[0].reservas).toHaveLength(2);
    expect(panel.clients()[0].coincidencias).toBe(1);
    panel.query.set('inexistente');
    expect(panel.sessionGroups()).toEqual([]);
    expect(panel.clients()).toEqual([]);
  });

  it('no trunca los localizadores que superan cuatro cifras', () => {
    expect(panel.number(reservation(7, 1))).toBe('0007');
    expect(panel.number(reservation(12345, 1))).toBe('12345');
  });
});
