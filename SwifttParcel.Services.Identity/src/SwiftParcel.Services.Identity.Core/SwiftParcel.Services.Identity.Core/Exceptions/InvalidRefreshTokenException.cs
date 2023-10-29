using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SwiftParcel.Services.Identity.Core.Exceptions
{
    public class InvalidRefreshTokenException : DomainException
    {
        public override string Code => "invalid_refresh_token";
        
        public InvalidRefreshTokenException() : base("Invalid refresh token.")
        {
        }
    }
}