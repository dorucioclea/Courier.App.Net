using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SwiftParcel.Services.Availability.Application.DTO
{
    public class ReservationDto
    {
        public DateTime DateTime { get; set; }
        public int Priority { get; set; }
    }
}