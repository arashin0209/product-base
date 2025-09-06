import { NextRequest, NextResponse } from 'next/server'
import { constantsService } from '../../../../../src/application/constants/constants.service'
import { handleAPIError } from '../../../../../src/shared/errors'

export async function GET(request: NextRequest) {
  try {
    const constants = await constantsService.getConstants()
    
    return NextResponse.json({
      success: true,
      data: constants
    })
    
  } catch (error) {
    return handleAPIError(error)
  }
}