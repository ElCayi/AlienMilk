package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.DatosNoValidosException;
import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.exception.OperacionNoPermitidaException;
import retotransversal.modelo.dto.AsistenteDto;
import retotransversal.modelo.dto.ReservaEditarDto;
import retotransversal.modelo.entities.*;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.service.EventoService;
import retotransversal.modelo.service.PagosReservasService;
import retotransversal.modelo.service.UsuarioService;
import retotransversal.restcontroller.AdminReservaRestController;

class AdminReservasTest {
    private final ReservaRepository repository = mock(ReservaRepository.class);
    private final EventoService eventos = mock(EventoService.class);
    private final ReservaServiceImpl service = new ReservaServiceImpl(repository, eventos, mock(UsuarioService.class),
            new PagosReservasService(repository, eventos, null, java.time.Clock.systemUTC()));
    private final Reserva reserva = Reserva.builder().idReserva(7).cantidad(1)
            .precioVenta(new BigDecimal("25.00"))
            .evento(Evento.builder().idEvento(3).estado(EstadoEvento.ACTIVO).build())
            .usuario(Usuario.builder().username("ana").nombre("Ana").build())
            .conformidadEn(LocalDateTime.of(2026, 10, 1, 10, 0))
            .adaptaciones("Acceso adaptado").build();
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AdminReservaRestController(service))
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    AdminReservasTest() {
        when(repository.findById(7)).thenReturn(Optional.of(reserva));
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void updatesParticipantsWithoutChangingBookingOrConsent() throws Exception {
        Asistente original = Asistente.builder().idAsistente(9).nombre("Anterior")
                .credencial(Credencial.DNI_NIE).reserva(reserva).orden(1).build();
        reserva.setAsistentes(new ArrayList<>(List.of(original)));
        mvc.perform(put("/api/admin/reservas/7/datos").contentType(MediaType.APPLICATION_JSON).content("""
                {"telefono":"+34 600 123 456", "observaciones":" Corregido ",
                 "asistentes":[{"nombre":" Ana corregida ","credencial":"PASAPORTE"}]}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idReserva").value(7))
                .andExpect(jsonPath("$.cantidad").value(1))
                .andExpect(jsonPath("$.precioVenta").value(25))
                .andExpect(jsonPath("$.asistentes[0].nombre").value("Ana corregida"))
                .andExpect(jsonPath("$.observaciones").value("Corregido"));
        assertThat(reserva.getAsistentes().getFirst()).isSameAs(original);
        assertThat(reserva.getConformidadEn()).isEqualTo(LocalDateTime.of(2026, 10, 1, 10, 0));
        assertThat(reserva.getAdaptaciones()).isEqualTo("Acceso adaptado");
    }

    @Test
    void canCompleteManualBookingWithoutInventingConsent() throws Exception {
        reserva.setConformidadEn(null);
        mvc.perform(put("/api/admin/reservas/7/datos").contentType(MediaType.APPLICATION_JSON).content("""
                {"asistentes":[{"nombre":"Ana","credencial":"DNI_NIE"}]}
                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.asistentes.length()").value(1));
        assertThat(reserva.getConformidadEn()).isNull();
    }

    @Test
    void rejectsInvalidDataBeforeChangingAnything() throws Exception {
        reserva.setTelefono("600000000");
        mvc.perform(put("/api/admin/reservas/7/datos").contentType(MediaType.APPLICATION_JSON).content("""
                {"telefono":"incorrecto", "asistentes":[null, {"nombre":"","credencial":"INVALIDA"}]}
                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.telefono").exists())
                .andExpect(jsonPath("$.errores.asistentes").exists())
                .andExpect(jsonPath("$.errores['asistentes.0.nombre']").exists());
        assertThat(reserva.getTelefono()).isEqualTo("600000000");
        verify(repository, never()).save(any());
    }

    private static ReservaEditarDto datosDeAna(String telefono) {
        return new ReservaEditarDto(telefono, "Del cliente",
                List.of(new AsistenteDto("Ana", "DNI_NIE", "Madrid, SOL-III", null)));
    }

    @Test
    void clientEditsOwnDataUntilTheDayBeforeButNotTheNotes() {
        reserva.setObservaciones("Del personal");
        when(eventos.admiteCancelaciones(any())).thenReturn(true);
        service.editarReservaPropia(7, "ana", datosDeAna("600 123 456"));
        assertThat(reserva.getTelefono()).isEqualTo("600 123 456");
        assertThat(reserva.getAsistentes()).extracting(Asistente::getNombre).containsExactly("Ana");
        assertThat(reserva.getObservaciones()).isEqualTo("Del personal");
    }

    @Test
    void clientCannotEditOthersLateOrWithoutPhone() {
        when(eventos.admiteCancelaciones(any())).thenReturn(true);
        assertThatThrownBy(() -> service.editarReservaPropia(7, "otra", datosDeAna("600 123 456")))
                .isInstanceOf(OperacionNoPermitidaException.class);
        assertThatThrownBy(() -> service.editarReservaPropia(7, "ana", datosDeAna(" ")))
                .isInstanceOf(DatosNoValidosException.class);
        when(eventos.admiteCancelaciones(any())).thenReturn(false);
        assertThatThrownBy(() -> service.editarReservaPropia(7, "ana", datosDeAna("600 123 456")))
                .isInstanceOf(ConflictoNegocioException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void adminChangesSeatsCountingTheCapacityWithoutItself() {
        Evento sesion = reserva.getEvento();
        sesion.setAforoMaximo(5);
        sesion.setPrecio(new BigDecimal("10.00"));
        Reserva otra = Reserva.builder().idReserva(8).cantidad(3).evento(sesion)
                .usuario(Usuario.builder().username("luis").build()).build();
        when(eventos.bloquear(3)).thenReturn(sesion);
        when(repository.findByEventoIdEventoAndCanceladaEnIsNull(3)).thenReturn(List.of(reserva, otra));

        service.editarReservaAdmin(7, new ReservaEditarDto(null, null, null, null, 2, null, null, null));
        assertThat(reserva.getCantidad()).isEqualTo(2);
        assertThat(reserva.getPrecioVenta()).isEqualByComparingTo("20.00");

        assertThatThrownBy(() -> service.editarReservaAdmin(7, new ReservaEditarDto(null, null, null, null, 3, null, null, null)))
                .isInstanceOf(ConflictoNegocioException.class).hasMessageContaining("2 plazas libres");
    }

    @Test
    void adminCancelsWithAReasonAndTheBookingStays() throws Exception {
        mvc.perform(post("/api/admin/reservas/7/cancelar").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.motivo").exists());
        mvc.perform(post("/api/admin/reservas/7/cancelar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\":\" Lo pidió por teléfono \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canceladaPor").value("ALIENMILK"))
                .andExpect(jsonPath("$.motivoCancelacion").value("Lo pidió por teléfono"))
                .andExpect(jsonPath("$.requiereRevision").value(false));
        verify(repository, never()).deleteById(any());
        assertThat(reserva.getCanceladaEn()).isNotNull();

        // Cancelada, es historial: ni se vuelve a cancelar ni se edita.
        assertThatThrownBy(() -> service.cancelarReservaAdmin(7, "Otra vez", true))
                .isInstanceOf(ConflictoNegocioException.class);
        assertThatThrownBy(() -> service.editarReservaAdmin(7, datosDeAna("600 123 456")))
                .isInstanceOf(ConflictoNegocioException.class);
    }

    @Test
    void theDoorMarksWhoComesInAndCanUndoAMistake() {
        Asistente persona = Asistente.builder().orden(1).nombre("Ana").credencial(Credencial.DNI_NIE).reserva(reserva).build();
        reserva.setAsistentes(new ArrayList<>(List.of(persona)));

        service.marcarEntrada(7, 1, true);
        assertThat(persona.getEntradaEn()).isNotNull();
        service.marcarEntrada(7, 1, false);
        assertThat(persona.getEntradaEn()).isNull();

        assertThatThrownBy(() -> service.contarEntradas(7, 1)).isInstanceOf(ConflictoNegocioException.class);
    }

    @Test
    void anUnregisteredBookingCountsItsSeatsAtTheDoor() {
        service.contarEntradas(7, 1);
        assertThat(reserva.getEntradasSinRegistrar()).isEqualTo(1);
        assertThatThrownBy(() -> service.contarEntradas(7, 2)).hasMessage("La reserva tiene 1 plaza");
    }

    @Test
    void aReviewIsDecidedWithANoteAndReopensWhenTheRequestChanges() {
        assertThat(reserva.requiereRevision()).isTrue();
        assertThatThrownBy(() -> service.revisar(7, false, " "))
                .isInstanceOf(retotransversal.exception.DatosNoValidosException.class);

        service.revisar(7, true, "Le reservamos una butaca accesible");
        assertThat(reserva.requiereRevision()).isFalse();
        assertThat(reserva.getRevisionNota()).isEqualTo("Le reservamos una butaca accesible");

        // Otra adaptación: lo aceptado era otra cosa.
        service.editarReservaAdmin(7, new ReservaEditarDto(null, null, null, null, null, "Acceso adaptado y penumbra",
                false, null));
        assertThat(reserva.requiereRevision()).isTrue();
        assertThat(reserva.getRevisionAceptada()).isNull();
    }

    @Test
    void aCancelledBookingComesBackOnlyIfNoMoneyMovedAndThereIsRoom() {
        Evento sesion = reserva.getEvento();
        sesion.setAforoMaximo(2);
        when(eventos.bloquear(3)).thenReturn(sesion);
        reserva.cancelar(CanceladaPor.ALIENMILK, "Error", LocalDateTime.now());

        service.reactivar(7);
        assertThat(reserva.cancelada()).isFalse();

        reserva.cancelar(CanceladaPor.CLIENTE, null, LocalDateTime.now());
        reserva.setImporteDevuelto(new BigDecimal("25.00"));
        assertThatThrownBy(() -> service.reactivar(7)).hasMessage("Ya se devolvió su importe: crea una reserva nueva");

        reserva.setImporteDevuelto(BigDecimal.ZERO);
        Reserva otra = Reserva.builder().idReserva(8).cantidad(2).evento(sesion)
                .usuario(Usuario.builder().username("luis").build()).build();
        when(repository.findByEventoIdEventoAndCanceladaEnIsNull(3)).thenReturn(List.of(otra));
        assertThatThrownBy(() -> service.reactivar(7)).hasMessage("Ya no quedan plazas suficientes en su sesión");
    }
}
